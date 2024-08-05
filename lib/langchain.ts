import { ChatOpenAI } from "@langchain/openai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import pineconeClient from "./pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { adminDb } from "@/firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";

// Initilalize OPEN AI api model
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o",
});

const embeddings = new OpenAIEmbeddings();
const LIMIT = 6;

const fetchMessagesFromDB = async (docId: string) => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("user not found");
  }

  const chats = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(docId)
    .collection("chat")
    .orderBy("createdAt", "desc")
    .limit(LIMIT)
    .get();

  const chatHistory = chats.docs.map((doc) =>
    doc.data().role === "human"
      ? new HumanMessage(doc.data().message)
      : new AIMessage(doc.data().message)
  );

  console.log(
    `--- Fetched last ${chatHistory.length} messages successfully ---`
  );

  return chatHistory;
};

async function generateDocs(docId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("user not found");
  }

  console.log("--- Fetching the download url from firebase firestore ---");

  const firebaseRef = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(docId)
    .get();
  const downloadUrl = firebaseRef.data()?.downloadUrl;

  if (!downloadUrl) {
    throw new Error("Download URL not found");
  }

  console.log(`--- Download url fetched successfully: ${downloadUrl} ---`);
  // fetch the pdf from the specified url
  const response = await fetch(downloadUrl);

  //   load the pdf into a pdfdocuemnt object
  const data = await response.blob();

  //   load the pdf document from the specified path
  console.log("--- Loading PDF Document... ---");
  const loader = new PDFLoader(data);
  const docs = await loader.load();

  //  split the pdf document into chunks
  console.log(`--- spliting the document into smaller parts`);
  const splitter = new RecursiveCharacterTextSplitter();

  const splitDocs = await splitter.splitDocuments(docs);
  console.log(`--- split into ${splitDocs.length} parts ---`);

  return splitDocs;
}

async function namespaceExists(
  index: Index<RecordMetadata>,
  namespace: string
) {
  if (namespace === null) throw new Error("Name space is null");
  const { namespaces } = await index.describeIndexStats();
  return namespaces?.[namespace] !== undefined;
}

export const indexName = "chattopdf";

export async function generateEmbeddingsInPineConeVectorStore(docId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("user not found");
  }

  let pineconeVectorStore;

  console.log("--Generating embedding for the split documents");
  const index = await pineconeClient.index(indexName);
  const namespaceAlreadyExists = await namespaceExists(index, docId);

  if (namespaceAlreadyExists) {
    console.log(
      `--- Namespace ${docId} already exists, reusing the exisiting one ---`
    );

    pineconeVectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: docId,
    });

    return pineconeVectorStore;
  } else {
    // if the namespace does not exist, download the pdf from firestore via the store download url & genreate the embeddings and streo them in the pine cone vector store
    const splitDocs = await generateDocs(docId);

    console.log(
      `--- Storing the embeddings in namespace ${docId} in the ${indexName} pinecone vector store`
    );

    pineconeVectorStore = await PineconeStore.fromDocuments(
      splitDocs,
      embeddings,
      {
        pineconeIndex: index,
        namespace: docId,
      }
    );
  }

  return pineconeVectorStore;
}

export const generateLangchainCompletion = async (
  docId: string,
  question: string
) => {
  let pineconeVectorStore;

  pineconeVectorStore = await generateEmbeddingsInPineConeVectorStore(docId);

  if (!pineconeVectorStore) {
    throw new Error("Pinecone vectore store not found");
  }

  //  Create a retriever to search through the vector store
  console.log("--- creating a retriever ---");
  const retriever = pineconeVectorStore.asRetriever();

  // Fetch the chat messages from the database
  const chatHistory = await fetchMessagesFromDB(docId);

  // Define prompt template for generating search queries based on conversation history
  console.log("--- Defining a promt template. ---");
  const historyAwarePrompt = ChatPromptTemplate.fromMessages([
    ...chatHistory, // insert the actual history here
    ["user", "{input}"],
    [
      "user",
      "Given the above conversation, generate a search query to look up in order to get nfromation relevant to the conversation",
    ],
  ]);

  // Create a history-aware retriever chain that uses the model, retriever, and prompt
  console.log("--- Creating a history-aware retiever chain. ---");
  const historyAwareRetrieverChain = await createHistoryAwareRetriever({
    llm: model,
    retriever,
    rephrasePrompt: historyAwarePrompt,
  });

  // Define a prompt template for answering questions based on retrieved context
  console.log("--- Defining a prompt template for answering questions... ---");
  const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Answer the user's questions based on the below context: \n\n{context}",
    ],
    ...chatHistory,
    ["user", "{input}"],
  ]);

  // Create a chain to combine the retrieved documents into a coherent response
  console.log("--- Creating a document combining chain... ---");
  const historyAwareCombineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: historyAwareRetrievalPrompt,
  });

  // Create the main retireval chain that combies the history-aware retriever and document combining chains
  console.log("--- Creating th main retrieval chain ... ---");
  const conversationalREtrievalChain = await createRetrievalChain({
    retriever: historyAwareRetrieverChain,
    combineDocsChain: historyAwareCombineDocsChain,
  });

  console.log("--- Running the chain with a sample conversation ... ---");
  const reply = await conversationalREtrievalChain.invoke({
    chat_history: chatHistory,
    input: question,
  });

  // Print the result to the console.
  console.log(reply.answer);
  return reply.answer;
};
