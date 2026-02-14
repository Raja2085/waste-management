"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { Send, Search, Phone, Video, MoreVertical, Loader2 } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";
import { useSearchParams } from "next/navigation";

// Types
type UserProfile = {
    id: string;
    email: string; // fallback if name not found
    first_name?: string;
    last_name?: string;
    company_name?: string; // for producers
    user_metadata?: any;
};

type Message = {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
};

type Conversation = {
    user: UserProfile;
    lastMessage: Message | null;
    unreadCount: number;
};

function MessagingInterfaceContent() {
    const searchParams = useSearchParams();
    const sellerIdParam = searchParams.get("sellerId");
    const productNameParam = searchParams.get("productName");

    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Track if we have already handled the auto-message for this session/mount
    const [autoMessageSent, setAutoMessageSent] = useState(false);
    const sendingRef = useRef(false);

    // Helper to dedupe conversations by user ID
    const setUniqueConversations = (newConvs: Conversation[] | ((prev: Conversation[]) => Conversation[])) => {
        setConversations(prev => {
            const next = typeof newConvs === 'function' ? newConvs(prev) : newConvs;
            const unique = new Map<string, Conversation>();
            next.forEach(c => unique.set(c.user.id, c));

            return Array.from(unique.values()).sort((a, b) =>
                new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime()
            );
        });
    };

    // Initialize
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser(user.id);
                // First fetch conversations
                await fetchConversations(user.id);

                // Then handle URL Params (Contact Seller) if present
                if (sellerIdParam && sellerIdParam !== user.id) {
                    await handleContactSeller(sellerIdParam, user);
                }
            }
            setLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sellerIdParam]); // Re-run if sellerId parameter changes

    const handleContactSeller = async (targetUserId: string, currentUserObj: any) => {
        if (sendingRef.current || autoMessageSent) return;

        // 1. Fetch target user details
        const { data: userData } = await supabase
            .from("users")
            .select("id, email, first_name, last_name, company_name")
            .eq("id", targetUserId)
            .single();

        if (userData) {
            // Select this user immediately
            selectUser(userData);

            // 2. Check Auto-Send Condition
            // Check if ANY messages exist between these two users
            const { count } = await supabase
                .from("messages")
                .select("*", { count: 'exact', head: true })
                .or(`and(sender_id.eq.${currentUserObj.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserObj.id})`);

            // If no previous messages AND we have a product name AND haven't sent yet
            if ((count === 0 || count === null) && productNameParam && !sendingRef.current) {
                sendingRef.current = true; // Lock

                // Construct message
                const name = currentUserObj.user_metadata?.first_name
                    ? `${currentUserObj.user_metadata.first_name} ${currentUserObj.user_metadata.last_name || ""}`
                    : "a consumer";

                const content = `Hi, I'm ${name} and I'm interested in ${productNameParam}.`;

                // Send it directly
                const payload = {
                    sender_id: currentUserObj.id,
                    receiver_id: targetUserId,
                    content: content,
                };

                await supabase.from("messages").insert(payload);
                setAutoMessageSent(true);
            }
        }
    };

    // Fetch conversations (grouped by user)
    const fetchConversations = async (userId: string) => {
        // 1. Get all messages where user is sender or receiver
        const { data: msgs, error } = await supabase
            .from("messages")
            .select("*")
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order("created_at", { ascending: false });

        if (error || !msgs) return;

        // 2. Extract unique other user IDs
        const otherUserIds = Array.from(new Set(
            msgs.map(m => m.sender_id === userId ? m.receiver_id : m.sender_id)
        ));

        if (otherUserIds.length === 0) {
            // Only clear if we aren't initiating a new chat via params which might temporarily have 0 convos
            if (!sellerIdParam) setUniqueConversations([]);
            return;
        }

        // 3. Fetch user details for these IDs
        const { data: usersData } = await supabase
            .from("users")
            .select("id, email, first_name, last_name, company_name")
            .in("id", otherUserIds);

        const usersMap = new Map(usersData?.map(u => [u.id, u]));

        // 4. Build conversation objects
        const convs: Conversation[] = otherUserIds.map(otherId => {
            const user = usersMap.get(otherId) || { id: otherId, email: "Unknown User" };
            // Find last message
            const lastMsg = msgs.find(m => m.sender_id === otherId || m.receiver_id === otherId) || null;
            // Count unread
            const unread = msgs.filter(m => m.sender_id === otherId && m.receiver_id === userId && !m.is_read).length;

            return {
                user: user as UserProfile,
                lastMessage: lastMsg,
                unreadCount: unread
            };
        });

        // Sort by last message time
        convs.sort((a, b) =>
            new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime()
        );

        setUniqueConversations(convs);
    };

    // Fetch messages for selected conversation
    useEffect(() => {
        if (!selectedUserId || !currentUser) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from("messages")
                .select("*")
                .or(`and(sender_id.eq.${currentUser},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${currentUser})`)
                .order("created_at", { ascending: true });

            setMessages(data || []);
            scrollToBottom();

            // Mark as read (simplified)
            const unreadIds = data?.filter(m => m.sender_id === selectedUserId && !m.is_read).map(m => m.id) || [];
            if (unreadIds.length > 0) {
                await supabase.from("messages").update({ is_read: true }).in("id", unreadIds);
                // Optimistic update for sidebar unread count
                setUniqueConversations(prev => prev.map(c =>
                    c.user.id === selectedUserId ? { ...c, unreadCount: 0 } : c
                ));
            }
        };

        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel("chat_room")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `receiver_id=eq.${currentUser}`, // Listen for incoming
                },
                (payload) => {
                    const newMsg = payload.new as Message;

                    // If message is from current chat, append
                    if (newMsg.sender_id === selectedUserId) {
                        setMessages(prev => [...prev, newMsg]);
                        scrollToBottom();
                    }

                    // Refresh conversations to update order/last message
                    if (currentUser) fetchConversations(currentUser);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `sender_id=eq.${currentUser}`, // Listen for outgoing (synced tabs)
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    // If message is to current chat, append (if not already optimistic added)
                    if (newMsg.receiver_id === selectedUserId) {
                        // Check if we already added it (dedupe optional but good practice)
                        setMessages(prev => {
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                        scrollToBottom();
                    }
                    if (currentUser) fetchConversations(currentUser);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedUserId, currentUser]);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedUserId || !currentUser) {
            console.warn("SendMessage blocked:", { messageInput, selectedUserId, currentUser });
            return;
        }

        try {
            const payload = {
                sender_id: currentUser,
                receiver_id: selectedUserId,
                content: messageInput.trim(),
            };

            const { data, error } = await supabase.from("messages").insert(payload).select().single();
            if (error) throw error;

            // Immediate update for sender
            if (data) {
                const newMsg = data as Message;
                setMessages(prev => [...prev, newMsg]);
                scrollToBottom();

                // Update conversations list (move to top)
                setUniqueConversations(prev => {
                    const otherConvs = prev.filter(c => c.user.id !== selectedUserId);
                    const currentConv = prev.find(c => c.user.id === selectedUserId);

                    if (currentConv) {
                        return [{
                            ...currentConv,
                            lastMessage: newMsg,
                            unreadCount: 0
                        }, ...otherConvs];
                    }
                    return prev;
                });
            }

            setMessageInput("");
        } catch (e) {
            console.error("Error sending message (catch):", e);
        }
    };

    // Search users
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        const { data } = await supabase
            .from("users")
            .select("id, email, first_name, last_name, company_name")
            .neq("id", currentUser) // Don't search self
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,company_name.ilike.%${query}%`)
            .limit(5);

        setSearchResults(data || []);
    };

    const selectUser = (user: UserProfile) => {
        // Optimistically set selected user
        setSelectedUserId(user.id);
        setSearchQuery("");
        setSearchResults([]);

        // Add to conversations if not present
        setUniqueConversations(prev => {
            if (prev.find(c => c.user.id === user.id)) return prev;

            return [{
                user,
                lastMessage: null,
                unreadCount: 0
            }, ...prev];
        });
    };

    const getDisplayName = (user: UserProfile) => {
        if (user.company_name) return user.company_name;
        if (user.first_name || user.last_name) return `${user.first_name || ""} ${user.last_name || ""}`.trim();
        return user.email.split("@")[0];
    };

    const getAvatar = (user: UserProfile) => {
        const name = getDisplayName(user);
        return name.charAt(0).toUpperCase();
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden mt-4">
            {/* Sidebar */}
            <div className={`w-full md:w-80 border-r dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800 ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-lg mt-2 z-10 max-h-60 overflow-y-auto">
                                {searchResults.map(u => (
                                    <div
                                        key={u.id}
                                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        onClick={() => selectUser(u)}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                                            {getAvatar(u)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{getDisplayName(u)}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 && (
                        <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                            <p>No conversations yet.</p>
                            <p className="mt-2 text-xs">Search for a user or contact a seller to start chatting.</p>
                        </div>
                    )}
                    {conversations.map((c) => (
                        <div
                            key={c.user.id}
                            onClick={() => setSelectedUserId(c.user.id)}
                            className={`flex items-center gap-3 p-4 hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-colors border-l-4 ${selectedUserId === c.user.id
                                ? "bg-white dark:bg-gray-700 border-blue-600 shadow-sm"
                                : "border-transparent"
                                }`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                    {getAvatar(c.user)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{getDisplayName(c.user)}</h3>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {c.lastMessage ? new Date(c.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                    </span>
                                </div>
                                <p className={`text-sm truncate ${c.unreadCount > 0 ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                                    {c.lastMessage ? c.lastMessage.content : <i>Start a conversation</i>}
                                </p>
                            </div>
                            {c.unreadCount > 0 && (
                                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {c.unreadCount}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            {selectedUserId ? (
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
                    <div className="h-20 border-b dark:border-gray-700 flex items-center justify-between px-6 bg-white dark:bg-gray-800 shrink-0">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedUserId(null)}
                                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
                            >
                                &larr;
                            </button>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                                {(() => {
                                    const u = conversations.find(c => c.user.id === selectedUserId)?.user;
                                    return u ? getAvatar(u) : "?";
                                })()}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                                    {(() => {
                                        const u = conversations.find(c => c.user.id === selectedUserId)?.user;
                                        return u ? getDisplayName(u) : "Loading...";
                                    })()}
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <Phone size={20} />
                            </button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <Video size={20} />
                            </button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <MoreVertical size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50/50 dark:bg-gray-900">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                                <p>Start the conversation!</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.sender_id === currentUser ? "flex-row-reverse" : "flex-row"}`}
                            >
                                <div
                                    className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender_id === currentUser
                                        ? "bg-gray-900 dark:bg-blue-600 text-white rounded-tr-none"
                                        : "bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none"
                                        }`}
                                >
                                    <p>{msg.content}</p>
                                    <span className={`text-[10px] block mt-2 text-right opacity-70`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>

                    <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-2xl">
                            <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 rounded-full transition-colors shadow-sm">
                                +
                            </button>
                            <input
                                type="text"
                                placeholder="Type your message..."
                                className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            />
                            <button
                                onClick={sendMessage}
                                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-md"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 text-blue-500 dark:text-blue-400">
                        <Send size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Select a conversation</h3>
                    <p className="max-w-xs text-center mt-2 text-gray-400 dark:text-gray-500">Choose a contact from the list or search for a user to start messaging.</p>
                </div>
            )}
        </div>
    );
}

export default function MessagingInterface() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></div>}>
            <MessagingInterfaceContent />
        </Suspense>
    );
}
