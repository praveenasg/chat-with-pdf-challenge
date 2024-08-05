"use server";

import { adminDb, adminStorage } from "@/firebaseAdmin";
import { indexName } from "@/lib/langchain";
import pineconeClient from "@/lib/pinecone";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteDocument(docId: string) {
  auth().protect();
  const { userId } = await auth();

  // 3 places to delete - firebase, firestore , pinecone embeddings namespace,
  // deleting from the firebase database
  await adminDb
    .collection("users")
    .doc(userId!)
    .collection("files")
    .doc(docId)
    .delete();

  // delete from firebase storage
  await adminStorage
    .bucket(process.env.FIREBASE_STORAGE_BUCKET) //update the env variables
    .file(`users/${userId}/files/${docId}`)
    .delete();

  // Delete all embeddings associated with the document
  const index = await pineconeClient.index(indexName);
  await index.namespace(docId).deleteAll();

  // revalidate the dashboard page to ensure the documents are up to date
  revalidatePath("/dashboard");
}
