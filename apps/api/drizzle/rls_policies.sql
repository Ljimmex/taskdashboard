-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS POLICIES
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- TEAMS POLICIES
-- =============================================================================

-- Team members can view their teams
CREATE POLICY "Team members can view teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

-- Owners can update their teams
CREATE POLICY "Owners can update teams" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

-- Owners can delete their teams
CREATE POLICY "Owners can delete teams" ON teams
  FOR DELETE USING (owner_id = auth.uid());

-- Any authenticated user can create a team
CREATE POLICY "Authenticated users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- TEAM MEMBERS POLICIES
-- =============================================================================

-- Members can view other members in their teams
CREATE POLICY "Members can view team members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Owners/admins can add members
CREATE POLICY "Admins can insert members" ON team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners/admins can remove members
CREATE POLICY "Admins can delete members" ON team_members
  FOR DELETE USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- PROJECTS POLICIES
-- =============================================================================

-- Team members can view projects
CREATE POLICY "Team members can view projects" ON projects
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team members can create projects
CREATE POLICY "Team members can create projects" ON projects
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team members can update projects
CREATE POLICY "Team members can update projects" ON projects
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- =============================================================================
-- TASKS POLICIES
-- =============================================================================

-- Team members can view tasks in their projects
CREATE POLICY "Team members can view tasks" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Team members can create tasks
CREATE POLICY "Team members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Team members can update tasks
CREATE POLICY "Team members can update tasks" ON tasks
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Assignee or reporter can delete tasks
CREATE POLICY "Assignee or reporter can delete tasks" ON tasks
  FOR DELETE USING (
    assignee_id = auth.uid() OR reporter_id = auth.uid()
  );

-- =============================================================================
-- TASK COMMENTS POLICIES
-- =============================================================================

-- Team members can view comments
CREATE POLICY "Team members can view comments" ON task_comments
  FOR SELECT USING (
    task_id IN (SELECT id FROM tasks WHERE project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    ))
  );

-- Team members can create comments
CREATE POLICY "Team members can create comments" ON task_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Users can delete own comments
CREATE POLICY "Users can delete own comments" ON task_comments
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- FILES POLICIES
-- =============================================================================

-- Team members can view files
CREATE POLICY "Team members can view files" ON files
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team members can upload files
CREATE POLICY "Team members can upload files" ON files
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Uploader can delete files
CREATE POLICY "Uploader can delete files" ON files
  FOR DELETE USING (uploaded_by = auth.uid());

-- =============================================================================
-- CONVERSATIONS POLICIES
-- =============================================================================

-- Team members can view conversations
CREATE POLICY "Team members can view conversations" ON conversations
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team members can create conversations
CREATE POLICY "Team members can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- =============================================================================
-- MESSAGES POLICIES
-- =============================================================================

-- Team members can view messages
CREATE POLICY "Team members can view messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Team members can send messages
CREATE POLICY "Team members can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
  );

-- Sender can delete own messages
CREATE POLICY "Sender can delete own messages" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- =============================================================================
-- CALENDAR EVENTS POLICIES
-- =============================================================================

-- Team members can view events
CREATE POLICY "Team members can view events" ON calendar_events
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team members can create events
CREATE POLICY "Team members can create events" ON calendar_events
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Creator can update events
CREATE POLICY "Creator can update events" ON calendar_events
  FOR UPDATE USING (created_by = auth.uid());

-- Creator can delete events
CREATE POLICY "Creator can delete events" ON calendar_events
  FOR DELETE USING (created_by = auth.uid());
