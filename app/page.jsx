import HeroSection from "@/components/hero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { faqs } from "@/data/faqs";
import { features } from "@/data/features";
import { howItWorks } from "@/data/howItWorks";
import { testimonial } from "@/data/testimonial";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative">
      <div className="grid-background"></div>
      <HeroSection />
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            Powerful features to help you land your dream job
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mx-w-6xl mx-auto">
            {features.map((feature, index) => {
              return (
                <Card
                  key={index}
                  className={
                    "border-2 hover:border-primary transition-colors duration-300"
                  }
                >
                  <CardContent
                    className={"pt-6 text-center flex flex-col items-center"}
                  >
                    <div className="flex flex-col items-center justify-center">
                      {feature.icon}
                      <h3 className="text-xl font-bold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mx-w-6xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-4xl font-bold text-center">50+</h3>
              <p className="text-muted-foreground">Industies Covered</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-4xl font-bold text-center">1000+</h3>
              <p className="text-muted-foreground">Intervew Questions</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-4xl font-bold text-center">95%</h3>
              <p className="text-muted-foreground">Success Rate</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-4xl font-bold text-center">24/7</h3>
              <p className="text-muted-foreground">AI Support</p>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className=" text-muted-foreground ">
              Four simple steps to accelerate your career growth
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mx-w-6xl mx-auto">
            {howItWorks.map((item, index) => {
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10  flex items-center justify-center ">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3  gap-8 mx-w-6xl mx-auto">
            {testimonial.map((item, index) => {
              return (
                <Card key={index} className={"bg-background"}>
                  <CardContent className={"pt-6 "}>
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="releative h-12 w-12 flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.author}
                            width={40}
                            height={40}
                            className="rounded-full object-cover border-2 border-primary/20"
                          />
                        </div>
                        <div>
                          <p className="font-semibold">{item.author}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.role}
                          </p>
                          <p className="text-sm text-primary">{item.company}</p>
                        </div>
                      </div>
                      <blockquote>
                        <p className="text-muted-foreground italic relative">
                          <span className="text-3xl text-primary absolute -top-4 -left-2">
                            &quot;
                          </span>
                          {item.quote}
                          <span className="text-3xl text-primary absolute -bottom-4">
                            &quot;
                          </span>
                        </p>
                      </blockquote>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className=" text-muted-foreground ">
              Find answers to most common questions about our platform
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, index) => {
                return (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      </section>
      <section className="w-full">
        <div
          style={{
            background:
              "linear-gradient(90deg, hsla(205, 46%, 10%, 1) 0%, hsla(191, 28%, 23%, 1) 50%, hsla(207, 41%, 27%, 1) 100%)",
          }}
          className="text-white"
        >
          <div className="container mx-auto py-24">
            <div className="flex flex-col items-center justify-center text-center space-y-4 mx-auto max-w-4xl px-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Ready to Accelerate Your Career?
              </h2>
              <p className="mx-auto max-w-[600px] text-white/80 md:text-xl text-sm">
                Join thousands advancing their careers with AI-powered tools.
                <br />
                Sign up now to take the first step toward your dream job!
              </p>

              <Link href="/dashboard" passHref>
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-11 mt-5 transition-all hover:scale-105 cursor-pointer"
                >
                  Start Your Journey Today{" "}
                  <ArrowRight className="ml-2 h-4 w-4 animate-bounce" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
