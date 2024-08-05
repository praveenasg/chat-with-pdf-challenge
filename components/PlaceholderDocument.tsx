"use client";
import { FrownIcon, PlusCircleIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import useSubscription from "@/hooks/useSubscription";

function PlaceholderDocument() {
  const router = useRouter();
  const { isOverFileLimit } = useSubscription();
  console.log("isOverFileLimit", isOverFileLimit);
  const handleClick = () => {
    //  check if user id FREE tire and if they are over the file limit, us to the upgrade page
    if (isOverFileLimit) {
      router.push("/dashboard/upgrade");
    } else {
      router.push("/dashboard/upload");
    }
  };
  return (
    <Button
      onClick={handleClick}
      className="flex flex-col items-center w-64 h-80 rounded-xl bg-gray-200 drop-shadow-md text-gray-400 "
    >
      {isOverFileLimit ? (
        <FrownIcon className="h-16 w-16" />
      ) : (
        <PlusCircleIcon
          className="h16
     w-1/6"
        />
      )}
      <p>
        {isOverFileLimit ? "Upgrade to add more documents" : "Add a document"}
      </p>
    </Button>
  );
}
export default PlaceholderDocument;
