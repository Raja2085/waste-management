-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view messages they sent or received"
  ON messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Optional: Update is_read status
CREATE POLICY "Users can update their received messages"
  ON messages
  FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Indexes for performance
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
