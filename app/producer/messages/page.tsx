"use client";

import MessagingInterface from "@/components/MessagingInterface";

export default function ProducerMessagesPage() {
    return (
        <div className="h-full flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Messages</h1>
            <p className="text-gray-500 mb-4">Manage your communications with consumers directly.</p>
            <MessagingInterface userType="producer" />
        </div>
    );
}
