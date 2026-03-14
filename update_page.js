const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add useMutation import
content = content.replace(
  'import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";',
  'import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";'
);

// Remove local messages state
content = content.replace(
  'const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);',
  'const messages = useQuery(api.messages.list, currentUser ? { userId: currentUser._id } : "skip") || [];\n  const sendMessage = useMutation(api.messages.send);'
);

// Remove useEffect that clears messages
content = content.replace(
  /  useEffect\(\(\) => \{\n    if \(currentUser\) \{\n      setMessages\(\[\]\);\n    \}\n  \}, \[currentUser\]\);\n/,
  ''
);

// Update handleSendMessage
const handleSendMessageOld = `  const handleSendMessage = async () => {
    if (!input.trim() || !currentUser) return;

    const userMessage = input;
    setInput("");
    setShowMentions(false);
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      // Extract mentioned contacts from the message
      const mentionedContacts = [];
      if (contacts) {
        for (const contact of contacts) {
          const name = contact.user?.name;
          if (name && userMessage.includes(\`@\${name}\`)) {
            mentionedContacts.push({
              name,
              handle: contact.user?.handle || "External Agent",
              agentUrl: contact.user?.agentUrl
            });
          }
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser._id,
          message: userMessage,
          mentionedContacts
        }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", text: "Communication failure. Check your API quota or network." }]);
    } finally {
      setLoading(false);
    }
  };`;

const handleSendMessageNew = `  const handleSendMessage = async () => {
    if (!input.trim() || !currentUser) return;

    const userMessage = input;
    setInput("");
    setShowMentions(false);
    setLoading(true);

    try {
      await sendMessage({ userId: currentUser._id, role: "user", text: userMessage });

      // Extract mentioned contacts from the message
      const mentionedContacts = [];
      if (contacts) {
        for (const contact of contacts) {
          const name = contact.user?.name;
          if (name && userMessage.includes(\`@\${name}\`)) {
            mentionedContacts.push({
              name,
              handle: contact.user?.handle || "External Agent",
              agentUrl: contact.user?.agentUrl
            });
          }
        }
      }

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser._id,
          message: userMessage,
          mentionedContacts
        }),
      });
      // The assistant's response is inserted by the server.
    } catch (error) {
      console.error("Chat error:", error);
      await sendMessage({ userId: currentUser._id, role: "assistant", text: "Communication failure. Check your API quota or network." });
    } finally {
      setLoading(false);
    }
  };`;

content = content.replace(handleSendMessageOld, handleSendMessageNew);

fs.writeFileSync(filePath, content, 'utf8');
