import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import Loader from "../components/Loader";

// Define Job type for clarity, though it's not strictly necessary if not imported
interface Job {
  id: string;
  fileName: string;
  status: string;
  createdAt: { toDate: () => Date };
  completedAt?: { toDate: () => Date };
  error?: string;
}

const LogScreenPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "jobs"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedJobs: Job[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        fetchedJobs.push({
          id: doc.id,
          fileName: data.fileName || "Unknown File",
          status: data.status || "UNKNOWN",
          createdAt: data.createdAt,
          completedAt: data.completedAt,
          error: data.error,
        });
      });
      setJobs(fetchedJobs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching job logs:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <Loader message="Loading job logs..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Processing Logs</h1>
      <p className="text-slate-500">
        Monitor the progress and status of your AI content generation jobs.
      </p>
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <p className="text-center py-8 text-slate-500">
            No jobs have been initiated yet.
          </p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
              <div className="flex justify-between items-center">
                <p className="font-bold truncate" title={job.fileName}>
                  {job.fileName}
                </p>
                <p className={`font-bold text-sm ${
                  job.status === "SUCCESS" ? "text-green-500" :
                  job.status === "FAILED" ? "text-red-500" :
                  "text-sky-500 animate-pulse"
                }`}>
                  {job.status}
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Started: {job.createdAt?.toDate().toLocaleString()}
              </p>
              {job.completedAt && (
                <p className="text-xs text-slate-400 mt-1">
                  Completed: {job.completedAt.toDate().toLocaleString()}
                </p>
              )}
              {job.error && (
                <p className="text-xs text-red-700 mt-1">
                  Error: {job.error}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogScreenPage;