import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../contexts/DataContext";
import { useToast } from "../components/Toast";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const GeneratorPage = () => {
  const { user } = useData();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [sourceText, setSourceText] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasteAndGenerate = async () => {
    if (sourceText.length < 100 || !user) {
      addToast("Please enter at least 100 characters of text.", "error"); return;
    }
    setIsPasting(true);
    try {
        await addDoc(collection(db, "userUploads"), {
            uid: user.uid,
            fileName: `Pasted Text - ${new Date().toLocaleString()}`,
            originalFilePath: 'pasted_text',
            extractedText: sourceText,
            status: "processed", // Ready for interactive pipeline
            createdAt: serverTimestamp(),
        });
        addToast("Pasted text submitted! Review on the Admin page.", "success");
        navigate('/admin/review');
    } catch (error: any) { addToast(error.message, "error"); }
    finally { setIsPasting(false); }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const storage = getStorage();
      const filePath = `uploads/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      addToast(
        "File uploaded! It will appear in the review queue shortly.",
        "success",
        5000,
      );
      navigate('/admin/review');
    } catch (error: any) { addToast(`File upload failed: ${error.message}`, "error"); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Content Factory</h1>
      <p className="text-slate-500">
        Upload a file or paste text. The content will then appear in the{" "}
        <Link to="/admin/review" className="text-sky-500 hover:underline">
          Review Queue
        </Link>{" "}
        for you to generate and approve.
      </p>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-2">1. Upload a File (PDF/Image)</h2>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf,image/*"
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
            file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700
            hover:file:bg-sky-100 disabled:opacity-50"
          disabled={isUploading}
        />
        {isUploading && (
          <p className="mt-2 text-sm text-sky-500 animate-pulse">
            Uploading...
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-2">2. Or Paste Text Manually</h2>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          className="w-full h-60 p-3 border rounded-md
            dark:bg-slate-700 dark:border-slate-600"
          placeholder="Paste clinical text here..."
        />
        <button
          onClick={handlePasteAndGenerate}
          disabled={isPasting}
          className="w-full mt-4 bg-sky-500 hover:bg-sky-600 text-white
            font-bold py-3 px-4 rounded-md disabled:opacity-50"
        >
          {isPasting ? "Submitting..." : "Submit Pasted Text"}
        </button>
      </div>
    </div>
  );
};
export default GeneratorPage;