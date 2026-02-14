"use client";

import MessagingInterface from "@/components/MessagingInterface";

export default function ConsumerMessagesPage() {
    return (
        <div className="h-full flex flex-col">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">My Messages</h1>
                <p className="text-gray-500 dark:text-gray-400">Chat with producers about your orders and inquiries.</p>
            </div>
            <MessagingInterface />
        </div>
    );
}
