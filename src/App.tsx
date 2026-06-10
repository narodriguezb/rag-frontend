import Sidebar from "./components/Sidebar";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";
import { useChat } from "./hooks/useChat";

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
    </div>
  );
}
