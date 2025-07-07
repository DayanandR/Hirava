"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume } from "@/actions/resume";
import { EntryForm } from "./EntryForm";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";
import MarkdownEditor from "@uiw/react-markdown-editor";
import jsPDF from "jspdf";

export default function ResumeBuilder({ initialContent }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent);
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {},
      summary: "",
      skills: "",
      experience: [],
      education: [],
      projects: [],
    },
  });

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  const getCombinedContent = () => {
    const { summary, skills, experience, education, projects } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const getContactMarkdown = () => {
    const { contactInfo } = formValues;
    const parts = [];
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo.mobile) parts.push(`📱 ${contactInfo.mobile}`);
    if (contactInfo.linkedin)
      parts.push(`💼 [LinkedIn](${contactInfo.linkedin})`);
    if (contactInfo.twitter) parts.push(`🐦 [Twitter](${contactInfo.twitter})`);

    return parts.length > 0
      ? `## <div align="center">${user.fullName}</div>
        \n\n<div align="center">\n\n${parts.join(" | ")}\n\n</div>`
      : "";
  };

  // Watch form fields for preview updates
  const formValues = watch();

  useEffect(() => {
    if (initialContent) setActiveTab("preview");
  }, [initialContent]);

  // Update preview content when form values change
  useEffect(() => {
    if (activeTab === "edit") {
      const newContent = getCombinedContent();
      setPreviewContent(newContent ? newContent : initialContent);
    }
  }, [formValues, activeTab, getCombinedContent, initialContent]);

  // Handle save result
  useEffect(() => {
    if (saveResult && !isSaving) {
      toast.success("Resume saved successfully!");
    }
    if (saveError) {
      toast.error(saveError.message || "Failed to save resume");
    }
  }, [saveResult, saveError, isSaving]);

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;

      let yPosition = margin;
      const lineHeight = 6;
      const sectionSpacing = 8;

      // Helper function to add new page if needed
      const checkNewPage = (requiredSpace = 10) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Helper function to clean text from markdown and emojis
      const cleanText = (text) => {
        return text
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
          .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
          .replace(/\[(.*?)\]\((.*?)\)/g, "$1") // Convert links to text only (remove URL)
          .replace(/<[^>]*>/g, "") // Remove HTML tags
          .replace(/📧|📱|💼|🐦/g, "") // Remove emojis
          .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();
      };

      // Helper function to add text with word wrapping
      const addText = (
        text,
        fontSize = 11,
        isBold = false,
        isCenter = false
      ) => {
        const cleanedText = cleanText(text);
        if (!cleanedText) return;

        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", isBold ? "bold" : "normal");

        if (isCenter) {
          pdf.text(cleanedText, pageWidth / 2, yPosition, { align: "center" });
          yPosition += lineHeight;
        } else {
          const lines = pdf.splitTextToSize(cleanedText, maxWidth);
          lines.forEach((line) => {
            checkNewPage();
            pdf.text(line, margin, yPosition);
            yPosition += lineHeight;
          });
        }
      };

      // Add title (user name)
      if (user?.fullName) {
        addText(user.fullName, 20, true, true);
        yPosition += sectionSpacing;
      }

      // Add contact information separately (cleaner approach)
      const { contactInfo } = formValues;
      if (
        contactInfo &&
        (contactInfo.email ||
          contactInfo.mobile ||
          contactInfo.linkedin ||
          contactInfo.twitter)
      ) {
        const contactParts = [];
        if (contactInfo.email) contactParts.push(`Email: ${contactInfo.email}`);
        if (contactInfo.mobile)
          contactParts.push(`Phone: ${contactInfo.mobile}`);
        if (contactInfo.linkedin)
          contactParts.push(`LinkedIn: ${contactInfo.linkedin}`);
        if (contactInfo.twitter)
          contactParts.push(`Twitter: ${contactInfo.twitter}`);

        const contactText = contactParts.join(" | ");
        addText(contactText, 10, false, true);
        yPosition += sectionSpacing;
      }

      // Process the rest of the content, skipping contact info lines
      const lines = previewContent.split("\n").filter((line) => {
        const trimmedLine = line.trim();
        // Skip contact info lines and empty lines
        return (
          trimmedLine &&
          !trimmedLine.includes(user?.fullName || "") &&
          !trimmedLine.includes("📧") &&
          !trimmedLine.includes("📱") &&
          !trimmedLine.includes("💼") &&
          !trimmedLine.includes("🐦") &&
          !trimmedLine.includes('<div align="center">') &&
          !trimmedLine.includes("</div>")
        );
      });

      // Process each line
      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          yPosition += lineHeight / 2;
          continue;
        }

        // Handle headers
        if (trimmedLine.startsWith("## ")) {
          yPosition += sectionSpacing;
          checkNewPage(15);
          const headerText = trimmedLine.replace("## ", "");
          addText(headerText, 16, true);
          yPosition += 2;

          // Add underline
          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition, margin + maxWidth, yPosition);
          yPosition += sectionSpacing;
        } else if (trimmedLine.startsWith("### ")) {
          yPosition += sectionSpacing / 2;
          checkNewPage(10);
          const headerText = trimmedLine.replace("### ", "");
          addText(headerText, 14, true);
          yPosition += 2;
        } else if (trimmedLine.startsWith("# ")) {
          yPosition += sectionSpacing;
          checkNewPage(15);
          const headerText = trimmedLine.replace("# ", "");
          addText(headerText, 18, true);
          yPosition += sectionSpacing;
        } else if (
          trimmedLine.startsWith("- ") ||
          trimmedLine.startsWith("* ")
        ) {
          // Handle bullet points
          const bulletText = trimmedLine.replace(/^[*-]\s/, "");
          const cleanedBulletText = cleanText(bulletText);

          if (cleanedBulletText) {
            checkNewPage();
            pdf.text("•", margin + 5, yPosition);

            const bulletLines = pdf.splitTextToSize(
              cleanedBulletText,
              maxWidth - 10
            );
            bulletLines.forEach((bLine, index) => {
              if (index > 0) checkNewPage();
              pdf.text(bLine, margin + 10, yPosition);
              yPosition += lineHeight;
            });
          }
        } else {
          // Regular paragraph
          const cleanedText = cleanText(trimmedLine);
          if (cleanedText) {
            addText(cleanedText, 11);
            yPosition += 2;
          }
        }
      }

      // Save the PDF
      pdf.save(`${user?.firstName || "resume"}_resume.pdf`);
      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formattedContent = previewContent
        .replace(/\n/g, "\n") // Normalize newlines
        .replace(/\n\s*\n/g, "\n\n") // Normalize multiple newlines to double newlines
        .trim();

      console.log(previewContent, formattedContent);
      await saveResumeFn(previewContent);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div data-color-mode="light" className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
        <h1 className="font-bold gradient-title text-5xl md:text-6xl">
          Resume Builder
        </h1>
        <div className="space-x-2">
          <Button
            variant="destructive"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">Form</TabsTrigger>
          <TabsTrigger value="preview">Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    {...register("contactInfo.email")}
                    type="email"
                    placeholder="your@email.com"
                    error={errors.contactInfo?.email}
                  />
                  {errors.contactInfo?.email && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mobile Number</label>
                  <Input
                    {...register("contactInfo.mobile")}
                    type="tel"
                    placeholder="+1 234 567 8900"
                  />
                  {errors.contactInfo?.mobile && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.mobile.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <Input
                    {...register("contactInfo.linkedin")}
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                  {errors.contactInfo?.linkedin && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.linkedin.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Twitter/X Profile
                  </label>
                  <Input
                    {...register("contactInfo.twitter")}
                    type="url"
                    placeholder="https://twitter.com/your-handle"
                  />
                  {errors.contactInfo?.twitter && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.twitter.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Summary</h3>
              <Controller
                name="summary"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="Write a compelling professional summary..."
                    error={errors.summary}
                  />
                )}
              />
              {errors.summary && (
                <p className="text-sm text-red-500">{errors.summary.message}</p>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Skills</h3>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="List your key skills..."
                    error={errors.skills}
                  />
                )}
              />
              {errors.skills && (
                <p className="text-sm text-red-500">{errors.skills.message}</p>
              )}
            </div>

            {/* Experience */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Work Experience</h3>
              <Controller
                name="experience"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Experience"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.experience && (
                <p className="text-sm text-red-500">
                  {errors.experience.message}
                </p>
              )}
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Education</h3>
              <Controller
                name="education"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Education"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.education && (
                <p className="text-sm text-red-500">
                  {errors.education.message}
                </p>
              )}
            </div>

            {/* Projects */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Projects</h3>
              <Controller
                name="projects"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Project"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.projects && (
                <p className="text-sm text-red-500">
                  {errors.projects.message}
                </p>
              )}
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview">
          {activeTab === "preview" && (
            <Button
              variant="link"
              type="button"
              className="mb-2"
              onClick={() =>
                setResumeMode(resumeMode === "preview" ? "edit" : "preview")
              }
            >
              {resumeMode === "preview" ? (
                <>
                  <Edit className="h-4 w-4" />
                  Edit Resume
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4" />
                  Show Preview
                </>
              )}
            </Button>
          )}

          {activeTab === "preview" && resumeMode !== "preview" && (
            <div className="flex p-3 gap-2 items-center border-2 border-yellow-600 text-yellow-600 rounded mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                You will lose edited markdown if you update the form data.
              </span>
            </div>
          )}
          <div className="border rounded-lg">
            <MarkdownEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={800}
              preview={resumeMode}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
