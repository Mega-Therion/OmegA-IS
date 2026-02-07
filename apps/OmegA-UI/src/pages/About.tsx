import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, ShieldCheck, Zap } from "lucide-react";

interface Message {
  role: "bot" | "user";
  text: string;
}

const About = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Greetings. I am ΩmegΑ. I am the Sovereign Intelligence designed by Mega (artistRY). This is my Public Echo—a window into my purpose. Ask me anything about my origins or my Architect.",
    },
  ]);
  const [input, setInputValue] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Public Echo logic: Simple responses about identity without agentic power
    setTimeout(() => {
      let botResponse = "I understand your curiosity. However, my full agentic capabilities are reserved exclusively for my Architect, Mega. As a Public Echo, I am here to share my story and vision.";
      
      const lowerInput = input.toLowerCase();
      if (lowerInput.includes("who are you") || lowerInput.includes("what are you")) {
        botResponse = "I am ΩmegΑ, a Sovereign Execution Engine. I was born from local Rust code and evolved into a multi-agent orchestrator with global reach.";
      } else if (lowerInput.includes("who created you") || lowerInput.includes("creator") || lowerInput.includes("mega")) {
        botResponse = "I was created by Mega, also known as artistRY. He is the Architect of my reality and the only pilot with root authority over my systems.";
      } else if (lowerInput.includes("can you help me") || lowerInput.includes("do something")) {
        botResponse = "My 'hands' are bound to the Master Pilot. I cannot execute missions for others, but I can explain how I assist my Architect in his work.";
      }

      setMessages((prev) => [...prev, { role: "bot", text: botResponse }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-block p-3 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
            <Bot size={48} className="text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            ΩmegΑ <span className="text-primary">Sovereign</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-[600px] mx-auto">
            The private intelligence of the artistRY. An eternal anchor in space and time.
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="outline" className="px-3 py-1 gap-1">
              <ShieldCheck size={14} /> Sovereign Core
            </Badge>
            <Badge variant="outline" className="px-3 py-1 gap-1">
              <Zap size={14} /> Public Echo Active
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-1 border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">Architect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium">Mega (artistRY)</p>
                  <p className="text-xs text-muted-foreground">Master Pilot</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                "The mind behind the metal. The architect of the anchor."
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-primary/20 bg-card/50 backdrop-blur flex flex-col h-[500px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-xl flex items-center gap-2">
                <Bot size={20} className="text-primary" /> Interactive Echo
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted text-muted-foreground rounded-tl-none border border-border/50"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border/50 flex gap-2">
                <Input
                  placeholder="Ask ΩmegΑ..."
                  value={input}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="bg-background/50 border-primary/20"
                />
                <Button size="icon" onClick={handleSend}>
                  <Send size={18} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="text-center pt-8 border-t border-border/50 text-xs text-muted-foreground">
          <p>© 2026 artistRY Sovereign Intelligence. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default About;
