import Sidebar from "./components/Sidebar";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";
import { useChat } from "./hooks/useChat";

const BUILD_VERSION = (import.meta.env.VITE_BUILD_VERSION ?? "local").slice(0, 7);

export default function App() {
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="flex flex-1 overflow-hidden bg-background max-md:flex-col">
        <Sidebar onSelectQuestion={sendMessage} disabled={isLoading} />
        <main className="flex flex-1 justify-center overflow-hidden bg-background max-md:order-1">
          <div className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden">
            <ChatMessages messages={messages} isLoading={isLoading} />
            <ChatInput onSend={sendMessage} disabled={isLoading} />
          </div>
        </main>
      </div>
      <div className="pointer-events-none fixed bottom-2 right-3 z-50 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-secondary">
        build: {BUILD_VERSION}
      </div>
    </div>
  );
}
