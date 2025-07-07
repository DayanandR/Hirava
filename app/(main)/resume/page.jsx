import { getResume } from "@/actions/resume";
import ResumeBuilder from "./_components/ResumeBuilder";

export default async function ResumePage() {
  const resume = await getResume();
  console.log(resume);

  return (
    <div className="container mx-auto py-6">
      <ResumeBuilder initialContent={resume?.content} />
    </div>
  );
}
