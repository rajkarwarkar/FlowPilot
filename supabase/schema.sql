-- FlowPilot AI Database Schema (Supabase PostgreSQL)
-- Run this in your Supabase SQL Editor to set up persistence tables.

-- 1. Inbox Items Table
CREATE TABLE IF NOT EXISTS inbox_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_message TEXT NOT NULL,
    ai_intent TEXT NOT NULL,
    ai_summary TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Workflows Table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inbox_item_id UUID REFERENCES inbox_items(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'proposed', -- 'proposed', 'approved', 'rejected', 'in_progress', 'completed'
    deadline TEXT NOT NULL,
    ai_reasoning TEXT NOT NULL,
    ai_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Workflow Steps Table
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    step_type TEXT NOT NULL DEFAULT 'action', -- 'trigger', 'context', 'action', 'approval', 'wait', 'decision'
    description TEXT NOT NULL,
    assignee TEXT NOT NULL DEFAULT 'AI System',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'executing', 'completed'
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    condition_action_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'message_received', 'intent_identified', 'memory_searched', 'memory_retrieved', 'workflow_generated', 'approval_requested', 'action_approved', 'action_rejected', 'action_edited', 'error'
    detail TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. AI Runs Table
CREATE TABLE IF NOT EXISTS ai_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation TEXT NOT NULL, -- 'intent_extraction', 'memory_search', 'workflow_generation'
    model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error'
    latency_ms INT NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Approvals Table
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_id UUID REFERENCES workflow_steps(id) ON DELETE SET NULL,
    step_number INT NOT NULL DEFAULT 1,
    proposed_action TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Allow read/write access (for development/service role usage)
CREATE POLICY "Allow anonymous read access" ON inbox_items FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON inbox_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access" ON workflows FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert/update access" ON workflows FOR ALL USING (true);

CREATE POLICY "Allow anonymous access" ON workflow_steps FOR ALL USING (true);
CREATE POLICY "Allow anonymous access" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Allow anonymous access" ON ai_runs FOR ALL USING (true);
CREATE POLICY "Allow anonymous access" ON approvals FOR ALL USING (true);
