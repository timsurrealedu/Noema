
# LifeOS Frontend Product Requirements Document

**Product name:** LifeOS
**Document type:** Frontend Product Requirements Document
**Version:** 0.1
**Status:** Initial design specification
**Primary platform:** Responsive web application
**Secondary platform:** Progressive Web App for mobile devices
**Target deployment:** Self-hosted Oracle Cloud server

---

# 1. Product Overview

LifeOS is a personal operating system that combines knowledge management, scheduling, task management, study tools, mobile coding, and automation monitoring into one unified interface.

The application is designed around a universal AI-powered input system. Instead of requiring the user to decide which application or page to open, the user can type, speak, upload, photograph, paste, draw, or attach almost anything.

LifeOS interprets the input and turns it into structured objects such as:

* Notes
* Tasks
* Calendar events
* Reminders
* Study materials
* Projects
* Contacts
* Documents
* Code-related actions
* Automation commands

The frontend must feel like one coherent system without exposing the complexity of the services operating behind it.

LifeOS should not look like several applications embedded into one dashboard. It should feel like a single workspace in which information naturally moves between different contexts.

---

# 2. Product Vision

LifeOS should become the primary interface through which the user manages their digital life.

The user should be able to:

1. Capture any information immediately.
2. Trust LifeOS to organize it appropriately.
3. Review and correct what the AI interpreted.
4. Find any information quickly.
5. Move naturally between time, knowledge, projects, and actions.
6. Access the same workflows from desktop and mobile.
7. Control external automation systems without cluttering the main workspace.

The central product promise is:

> Capture anything. LifeOS turns it into the right knowledge, action, or schedule.

---

# 3. Frontend Product Goals

## 3.1 Primary goals

The frontend must:

* Provide a single universal capture interface.
* Make AI actions understandable and reversible.
* Unite notes, tasks, calendar events, and projects visually.
* Work efficiently on desktop and mobile.
* Minimize navigation effort.
* Support keyboard-first power users.
* Support touch-first mobile users.
* Preserve the original source of captured information.
* Make complex automation systems feel manageable.
* Reveal advanced functionality only when needed.

## 3.2 Secondary goals

The frontend should:

* Feel fast even when AI processing takes time.
* Allow the user to continue working while background jobs run.
* Support offline drafting and capture where practical.
* Be installable as a Progressive Web App.
* Provide a consistent interface for current and future modules.
* Allow modules to be added without redesigning the entire navigation.

## 3.3 Non-goals for the first frontend version

The first frontend release will not attempt to provide:

* Full collaborative team workspaces
* Public social features
* A complete replacement for desktop IDEs
* Advanced spreadsheet functionality
* Complex enterprise role management
* Fully autonomous financial trading controls
* Pixel-perfect document publishing
* Multiplayer real-time canvas editing
* A marketplace for third-party plugins
* Multiple unrelated dashboard systems

---

# 4. Target User

## 4.1 Primary user

The initial version is designed for one primary self-hosting power user who:

* Uses Obsidian for notes and knowledge management
* Uses Google Calendar for scheduling
* Uses applications such as Flexcil for annotation
* Works across desktop and mobile devices
* Frequently takes screenshots and photographs of lecture materials
* Studies technical and mathematical subjects
* Uses AI coding agents
* Operates personal automation pipelines
* Wants a unified personal command center
* Is comfortable with advanced software but wants a simple daily interface

## 4.2 Future user types

The frontend should eventually support:

* Students
* Researchers
* Developers
* Founders
* Content creators
* Productivity enthusiasts
* Self-hosting users
* Small teams

The first design should remain personal-first rather than becoming a generic enterprise dashboard.

---

# 5. Product Principles

## 5.1 Capture first

The user must be able to capture information before deciding where it belongs.

The system should never force the user to choose between “task,” “note,” or “event” before entering information.

## 5.2 AI must remain visible

The application should clearly distinguish between:

* User-created content
* AI-extracted content
* AI-suggested content
* Confirmed system actions
* Unconfirmed system actions

## 5.3 Everything must be reversible

Any AI-created object should support:

* Undo
* Edit
* Move
* Restore
* View source
* View action history

## 5.4 Original sources must be preserved

When a user uploads a photograph, document, screenshot, voice recording, or handwritten page, the original must remain accessible from any generated note.

## 5.5 One system, multiple views

A task, event, note, project, person, and document may reference one another.

The frontend should show these relationships without duplicating the underlying information.

## 5.6 Progressive disclosure

The application should appear simple by default.

Advanced options should be available through:

* Context menus
* Detail drawers
* Command palette
* Expandable panels
* Settings

## 5.7 AI should reduce effort, not remove control

LifeOS should automate organization while allowing the user to understand and correct the result.

---

# 6. Core Product Objects

The frontend should use consistent visual patterns for the following object types.

## 6.1 Capture

An unprocessed or processed input submitted by the user.

Examples:

* Typed sentence
* Voice note
* Image
* Screenshot
* PDF
* Web link
* Handwritten canvas
* Forwarded email
* Code snippet

## 6.2 Note

A structured knowledge item.

A note may contain:

* Markdown
* Rich text
* Images
* Attachments
* Code blocks
* Equations
* Drawings
* AI-generated sections
* Links to other objects

## 6.3 Task

An actionable item that may contain:

* Due date
* Start date
* Priority
* Status
* Project
* Recurrence
* Reminder
* Checklist
* Dependencies

## 6.4 Event

A calendar-bound item containing:

* Start time
* End time
* Location
* Attendees
* Reminder
* Linked tasks
* Linked notes
* Meeting preparation
* Meeting outcome

## 6.5 Project

A collection of related work.

A project may contain:

* Notes
* Tasks
* Events
* Documents
* People
* Automations
* Code repositories
* Activity history

## 6.6 Document

An imported file or generated structured document.

Examples:

* Lecture PDF
* Proposal
* Presentation
* Research paper
* Image
* Spreadsheet

## 6.7 Person

A contact or entity referenced by notes, meetings, projects, and outreach activity.

## 6.8 Automation

A recurring or triggered process.

Examples:

* YouTube production pipeline
* Email outreach campaign
* Scheduled research job
* Data processing workflow

## 6.9 Job

One execution of an automation or AI process.

## 6.10 Notification

A system message requiring awareness or action.

---

# 7. Information Architecture

## 7.1 Primary navigation

The primary navigation should contain:

1. Today
2. Capture
3. Calendar
4. Tasks
5. Vault
6. Projects
7. Study
8. Coding
9. Automations

Secondary navigation should contain:

* Search
* Notifications
* Activity
* Settings
* Help

## 7.2 Navigation behavior

### Desktop

Desktop should use a collapsible left sidebar.

Expanded sidebar:

* Icon
* Section name
* Optional count
* Optional status indicator

Collapsed sidebar:

* Icon only
* Tooltip on hover
* Active section indicator

### Mobile

Mobile should use a bottom navigation bar containing the most frequent actions:

* Today
* Capture
* Tasks
* Vault
* More

The Capture control should be visually emphasized and positioned centrally.

“More” opens a sheet containing:

* Calendar
* Projects
* Study
* Coding
* Automations
* Activity
* Settings

## 7.3 Global top bar

The desktop top bar should contain:

* Current page title
* Breadcrumbs where applicable
* Global search trigger
* Command palette trigger
* Processing status
* Notifications
* User menu

The mobile top bar should contain:

* Page title
* Search
* Notifications
* Contextual action button

---

# 8. Global Application Shell

## 8.1 Layout regions

The application shell should support four possible regions:

1. Primary navigation sidebar
2. Main content area
3. Optional secondary panel
4. Optional inspector drawer

Example desktop layout:

```text
┌──────────────┬────────────────────────────┬──────────────────┐
│ Navigation   │ Main content               │ Context panel    │
│              │                            │                  │
│ Today        │                            │ Object details   │
│ Capture      │                            │ Related items    │
│ Calendar     │                            │ AI activity      │
│ Tasks        │                            │                  │
└──────────────┴────────────────────────────┴──────────────────┘
```

## 8.2 Inspector drawer

Selecting an item should optionally open an inspector drawer rather than forcing a full-page navigation.

The inspector may display:

* Object metadata
* Source
* AI interpretation
* Linked objects
* History
* Permissions
* Actions

The user should be able to pin the drawer open on desktop.

## 8.3 Context preservation

When the user opens and closes an object, the previous scroll position, filter state, and selected tab should remain preserved.

---

# 9. Universal Capture Experience

The universal capture experience is the most important part of LifeOS.

## 9.1 Capture entry points

The capture interface must be accessible from:

* Main navigation
* Floating mobile action button
* Global keyboard shortcut
* Command palette
* Today page
* Browser share target
* PWA share integration
* Clipboard paste
* Drag and drop
* Camera
* Microphone

## 9.2 Capture composer

The composer should support:

* Plain text
* Markdown
* Slash commands
* File attachment
* Image attachment
* Camera capture
* Voice recording
* Link paste
* Code blocks
* Quick drawings
* Multiple files

The default placeholder should be action-oriented:

> Capture a thought, task, event, file, or command…

## 9.3 Capture modes

The user should not need to select a mode.

However, optional manual mode controls may include:

* Auto
* Note
* Task
* Event
* Study
* Command

“Auto” must remain the default.

## 9.4 AI interpretation preview

After submission, LifeOS should display an interpretation card.

Example:

```text
Interpreted as:

Calendar event
Meeting with Dian
Tomorrow, 1:00–2:00 PM

Task
Review proposal
Due tomorrow, 12:00 PM

Related project
RevoU Partnership
```

Available actions:

* Confirm all
* Edit
* Confirm selected
* Undo
* Save as raw capture
* Reprocess

## 9.5 Confidence handling

### High-confidence interpretation

The application may create low-risk objects automatically and show an undo notification.

### Medium-confidence interpretation

The application should show a review card before creation.

### Low-confidence interpretation

The application should save the raw capture and ask one focused clarification.

## 9.6 Processing states

Capture items may have the following states:

* Uploading
* Queued
* Processing
* Needs review
* Completed
* Partially completed
* Failed
* Cancelled

Each state must be visually distinct without relying only on color.

## 9.7 Capture inbox

All captures should appear in an inbox view.

Inbox filters:

* Unprocessed
* Needs review
* Completed
* Failed
* Images
* Audio
* Documents
* Links
* Text

Each capture card should show:

* Original content preview
* Capture time
* Source
* Processing state
* Generated objects
* Confidence
* Quick actions

---

# 10. Today Page

The Today page is the default home screen.

It must answer:

* What is happening today?
* What should I do next?
* What requires my attention?
* What has LifeOS recently processed?

## 10.1 Desktop layout

The desktop Today page should contain:

### Header

* Current date
* Greeting
* Brief day summary
* Quick capture input

### Main timeline

A chronological combination of:

* Calendar events
* Scheduled tasks
* Deadlines
* Reminders
* Focus blocks

### Attention panel

Items such as:

* Overdue tasks
* Captures needing review
* Failed automations
* Unread important notifications
* Conflicting calendar events

### Recent activity

Examples:

* Lecture slides processed
* Note generated
* Automation completed
* Coding agent awaiting approval
* Outreach reply received

## 10.2 Mobile layout

Mobile should use a vertically stacked timeline.

Recommended order:

1. Quick capture
2. Next event
3. Priority task
4. Timeline
5. Attention items
6. Recent activity

## 10.3 Daily summary

LifeOS may display a compact AI-generated summary such as:

> You have two meetings, three tasks due, and one lecture capture waiting for review.

The summary should link directly to the relevant objects.

## 10.4 Empty state

When no items are scheduled:

> Your day is clear. Capture something, plan your day, or continue a recent project.

Suggested actions:

* Add task
* Add event
* Review inbox
* Open recent note

---

# 11. Calendar Module

## 11.1 Calendar views

The Calendar module should support:

* Day
* Three-day
* Week
* Month
* Agenda

Mobile should default to agenda or three-day view.

Desktop should default to week view.

## 11.2 Event creation

Events can be created through:

* Natural language
* Clicking an empty time
* Dragging across a time range
* Quick-add form
* Duplicating an existing event
* Converting a task into an event

## 11.3 Event card content

Calendar event cards may show:

* Event title
* Time
* Location
* Project color
* Preparation status
* Linked note indicator
* Attendee indicator
* Conflict indicator

## 11.4 Event detail

The event detail interface should contain:

* Title
* Date
* Start and end time
* Time zone
* Location
* Attendees
* Description
* Reminders
* Preparation tasks
* Meeting note
* Related project
* Related documents
* Event history

## 11.5 Event preparation

Upcoming events may include a preparation panel.

Example:

```text
Prepare for RevoU meeting

□ Review proposal
□ Read previous conversation
□ Prepare partnership questions
```

## 11.6 Calendar conflict handling

When events overlap, the UI should:

* Display the conflict clearly
* Show affected events
* Suggest possible alternatives
* Never move events automatically without approval

## 11.7 External calendar synchronization

The frontend should display synchronization state:

* Synced
* Syncing
* Offline changes pending
* Authentication required
* Sync conflict

The interface should avoid exposing low-level synchronization details unless the user opens diagnostics.

---

# 12. Task Module

## 12.1 Task views

The Tasks module should support:

* Inbox
* Today
* Upcoming
* Overdue
* Someday
* By project
* Completed
* All tasks

## 12.2 Task list behavior

The user should be able to:

* Complete tasks
* Reorder tasks
* Change priority
* Set due date
* Assign project
* Add subtasks
* Convert into calendar event
* Convert into note
* Duplicate
* Archive
* Delete
* Restore

## 12.3 Task card

A task card may display:

* Checkbox
* Title
* Due date
* Priority
* Project
* Recurrence
* Subtask progress
* Estimated duration
* Source indicator

## 12.4 Task detail

Task detail should include:

* Description
* Due date
* Scheduled time
* Priority
* Status
* Project
* Tags
* Subtasks
* Dependencies
* Attachments
* Linked notes
* Originating capture
* Activity history

## 12.5 Task statuses

Recommended default statuses:

* Inbox
* Next
* In progress
* Waiting
* Blocked
* Completed
* Cancelled

Projects may define custom task statuses later.

## 12.6 Natural-language task editing

The user should be able to type:

> Move this to Friday and remind me the night before.

The frontend must show the interpreted change before applying it when ambiguity exists.

---

# 13. Vault Module

The Vault replaces the core personal knowledge-management functionality of Obsidian.

## 13.1 Vault views

The Vault should provide:

* All notes
* Recent
* Favorites
* Daily notes
* Courses
* Projects
* Topics
* Tags
* Attachments
* Unlinked notes
* Graph
* Trash

## 13.2 Note list

Notes may be displayed as:

* Compact list
* Detailed list
* Card grid

Each note preview may contain:

* Title
* Excerpt
* Updated time
* Tags
* Linked project or course
* Attachment indicator
* AI-generated indicator

## 13.3 Note editor

The note editor should support:

* Markdown
* Rich-text shortcuts
* Headings
* Lists
* Checklists
* Tables
* Code blocks
* Syntax highlighting
* LaTeX equations
* Callouts
* Images
* File attachments
* Embeds
* Internal links
* Backlinks
* Tags
* Frontmatter or structured properties

## 13.4 Editor modes

The editor should support:

* Edit
* Reading
* Split preview
* Source Markdown

The default experience should feel visual while preserving Markdown compatibility.

## 13.5 Note properties

Properties should be shown in a collapsible section.

Examples:

* Type
* Course
* Project
* Date
* Status
* Source
* Author
* Tags
* Review state

## 13.6 Backlinks and relationships

The note sidebar should show:

* Linked references
* Unlinked mentions
* Related notes
* Related tasks
* Related events
* Source documents
* AI-suggested connections

AI-suggested relationships must not be silently made permanent.

## 13.7 AI note actions

Available AI actions may include:

* Summarize
* Expand
* Simplify
* Explain
* Generate questions
* Generate flashcards
* Extract tasks
* Find contradictions
* Link related notes
* Reorganize headings
* Convert to study guide

AI-generated sections should be visibly marked until accepted.

---

# 14. Study Module

The Study module is optimized for lecture materials, class notes, revision, and assignments.

## 14.1 Study dashboard

The Study dashboard should contain:

* Current courses
* Upcoming assignments
* Recent lecture captures
* Review queue
* Flashcards due
* Study sessions
* Course progress

## 14.2 Course workspace

Each course workspace should contain:

* Overview
* Notes
* Lectures
* Assignments
* Files
* Flashcards
* Questions
* Calendar
* Progress

## 14.3 Lecture capture flow

The user can:

1. Photograph slides.
2. Upload screenshots.
3. Upload a PDF.
4. Record lecture audio.
5. Import handwritten notes.
6. Add personal comments.

LifeOS should then display a processing result with:

* Detected course
* Detected lecture topic
* Extracted text
* Structured note
* Summary
* Important concepts
* Definitions
* Questions
* Flashcards
* Original source

## 14.4 Source comparison view

The user should be able to view the original slide and generated notes side by side.

Desktop:

```text
┌───────────────────────┬────────────────────────┐
│ Original slide        │ Generated notes        │
│                       │                        │
│ Image or PDF page     │ Structured explanation │
│                       │                        │
└───────────────────────┴────────────────────────┘
```

Mobile should switch between tabs:

* Source
* Notes
* Summary
* Questions

## 14.5 Review workflow

Generated study material can have:

* Unreviewed
* Reviewed
* Needs correction
* Mastered

The user should be able to mark AI-generated information as inaccurate.

## 14.6 Assignment workspace

An assignment object should contain:

* Title
* Course
* Instructions
* Deadline
* Rubric
* Attachments
* Task breakdown
* Working notes
* Submission file
* Submission status

---

# 15. Canvas and Handwriting Module

The canvas supports handwritten notes, diagrams, equations, and visual thinking.

## 15.1 Canvas functionality

The canvas should eventually support:

* Infinite canvas
* Pen
* Highlighter
* Eraser
* Shape tool
* Text tool
* Image placement
* Sticky notes
* Connectors
* Selection tool
* Zoom and pan
* Lasso selection
* Undo and redo
* Page backgrounds
* Grid and dotted paper
* Export

## 15.2 Mathematical input

The canvas should support:

* Handwritten equations
* LaTeX conversion
* Equation recognition
* Step extraction
* Clean equation rendering

## 15.3 AI canvas actions

The user may select a region and request:

* Convert handwriting to text
* Convert equation to LaTeX
* Explain the calculation
* Check the solution
* Summarize the diagram
* Turn into structured notes
* Add to a course
* Create flashcards

## 15.4 Source preservation

The original strokes should remain available after conversion.

Generated text should be a linked derivative rather than a destructive replacement.

## 15.5 MVP treatment

The first frontend version may include a basic canvas shell and attachment flow rather than full handwriting recognition.

---

# 16. Projects Module

Projects connect tasks, notes, events, files, people, and activity.

## 16.1 Project dashboard

Each project should provide:

* Overview
* Tasks
* Notes
* Calendar
* Files
* People
* Activity
* Automations
* Settings

## 16.2 Project overview

The overview should contain:

* Project summary
* Current status
* Next milestone
* Priority tasks
* Upcoming events
* Recent notes
* Recent activity
* Blockers

## 16.3 Project statuses

Recommended statuses:

* Idea
* Planned
* Active
* Paused
* Completed
* Archived

## 16.4 Project templates

Future templates may include:

* University assignment
* Software project
* Event
* Business partnership
* Content pipeline
* Research project

---

# 17. Coding Module

The Coding module provides mobile-friendly access to coding projects and AI coding agents.

## 17.1 Coding dashboard

The coding dashboard should show:

* Recent repositories
* Active agent sessions
* Pending approvals
* Running builds
* Failed tests
* Deployment status
* Recent commits

## 17.2 Repository workspace

A repository workspace may contain:

* File explorer
* Code editor
* AI chat
* Terminal
* Git changes
* Test results
* Preview
* Activity

## 17.3 Mobile coding experience

Mobile should prioritize:

* AI instructions
* Diff review
* Small file edits
* Build status
* Terminal commands
* Approval actions

It should not attempt to replicate a full desktop IDE interface.

## 17.4 Agent action review

Before an agent performs sensitive actions, the frontend should show:

* Proposed action
* Files affected
* Commands to run
* Risk level
* Permission requested

After execution, show:

* Files changed
* Diff
* Test results
* Errors
* Commit option
* Revert option

## 17.5 Session status

Agent sessions may have:

* Planning
* Waiting for approval
* Running
* Testing
* Completed
* Failed
* Cancelled

---

# 18. Automations Module

The Automations module serves as a control center for external systems.

## 18.1 Automation dashboard

The dashboard should show:

* Active automations
* Scheduled jobs
* Running jobs
* Failed jobs
* Jobs requiring attention
* Resource usage
* Recent outputs

## 18.2 Automation card

Each automation card should display:

* Name
* Status
* Last run
* Next run
* Success rate
* Current stage
* Warning indicator
* Quick pause control

## 18.3 Automation detail

Automation details may contain:

* Overview
* Run history
* Current job
* Schedule
* Inputs
* Outputs
* Logs
* Metrics
* Errors
* Controls
* Settings

## 18.4 Example: AI video pipeline

The frontend may show:

```text
Stewie Channel Pipeline

Status: Rendering
Current video: Episode 42
Stage: Scene composition
Progress: 67%
Estimated next stage: Audio mixing
```

Actions:

* Pause after current stage
* Cancel job
* Retry failed stage
* View output
* View logs

## 18.5 Example: outreach pipeline

The frontend may show:

* Contacts sourced
* Emails verified
* Drafts generated
* Drafts awaiting approval
* Emails sent
* Replies received
* Follow-ups due
* Opt-outs

## 18.6 High-risk automations

Financial or account-sensitive systems must be visually separated.

The interface must distinguish:

* Read-only monitoring
* Configuration
* Execution
* Emergency controls

High-risk actions require explicit confirmation.

---

# 19. Global Search

Search is a primary interaction rather than a utility page.

## 19.1 Search scope

Global search should include:

* Notes
* Tasks
* Events
* Projects
* Documents
* Captures
* People
* Automations
* Code repositories
* Activity history

## 19.2 Search behavior

Search should support:

* Exact text
* Semantic search
* Filters
* Date ranges
* Tags
* Object types
* Projects
* Courses
* Sources

## 19.3 Search result design

Search results should show:

* Object type icon
* Title
* Relevant excerpt
* Matched terms
* Location
* Modified date
* Related project
* Source

## 19.4 Natural-language search

Examples:

* “Show my notes about TCP congestion control.”
* “What meetings did I have with Dian?”
* “Find unfinished tasks from last semester.”
* “Show lecture slides that mention RSA.”
* “Which automation failed this week?”

The system should show how the query was interpreted.

---

# 20. Command Palette

The command palette should be accessible by keyboard and touch.

Suggested desktop shortcut:

* `Ctrl/Cmd + K`

The command palette may support:

* Navigate to page
* Create object
* Search
* Run AI action
* Open recent item
* Change theme
* Start automation
* Open repository
* Capture clipboard
* Add task
* Add event

Results should prioritize:

1. Current context actions
2. Frequently used actions
3. Recent objects
4. Global navigation

---

# 21. Notifications and Attention Management

## 21.1 Notification types

Notifications may include:

* Reminder
* Processing completed
* Processing failed
* AI clarification required
* Calendar conflict
* Automation failure
* Coding approval required
* Outreach reply
* Sync issue
* Security alert

## 21.2 Notification severity

Recommended levels:

* Informational
* Action required
* Warning
* Critical

## 21.3 Notification center

The notification center should support:

* Mark as read
* Mark all as read
* Snooze
* Open related object
* Resolve
* Filter
* Clear informational notifications

## 21.4 Avoiding notification overload

LifeOS should group repetitive notifications.

Example:

Instead of ten individual messages:

> Ten lecture images have finished processing.

---

# 22. Activity and Audit History

The Activity page should show major actions across LifeOS.

Examples:

* Capture submitted
* Event created
* Task rescheduled
* Note generated
* Document processed
* Agent changed code
* Automation started
* Email draft approved
* Settings changed

Each activity entry should show:

* Actor
* Action
* Object
* Time
* Source
* Undo availability
* Details

The user should be able to filter by:

* User actions
* AI actions
* Automation actions
* Object type
* Date
* Project

---

# 23. AI Interaction Design

## 23.1 AI presentation

AI should appear as a capability integrated into the interface rather than as a separate chatbot that controls everything.

AI interactions can appear as:

* Inline suggestions
* Contextual action menu
* Command palette actions
* Review cards
* Side-panel assistant
* Processing results
* Natural-language composer

## 23.2 AI side panel

The optional AI side panel should be aware of the currently open object.

Examples:

On a note:

> Summarize this note.

On a project:

> What is currently blocking this project?

On the calendar:

> Find time for a two-hour study session this week.

## 23.3 Tool transparency

When AI plans to perform actions, the frontend should display them as structured steps.

Example:

```text
LifeOS plans to:

1. Create an event tomorrow at 1:00 PM.
2. Add a preparation task due at 12:00 PM.
3. Link both items to the RevoU project.
```

The user can:

* Approve
* Edit steps
* Reject
* Approve once
* Always allow this low-risk action

## 23.4 AI-generated content indicators

AI-generated content should use a subtle indicator such as:

* Spark icon
* “Generated” label
* Light border
* Hoverable source information

The indicator should not make the interface visually noisy.

## 23.5 AI error correction

The user should be able to select:

* Incorrect date
* Incorrect category
* Incorrect summary
* Missing information
* Wrong project
* Hallucinated information

This feedback should be associated with the original action.

---

# 24. Design System

## 24.1 Visual direction

LifeOS should feel:

* Calm
* Focused
* Technical
* Intelligent
* Personal
* Modern
* Dense when necessary
* Uncluttered by default

It should avoid looking like:

* A corporate analytics dashboard
* A social network
* A generic AI chatbot
* A collection of unrelated widgets
* A science-fiction control panel
* An overly playful productivity application

## 24.2 Color system

The interface should support light and dark themes.

Use semantic color tokens rather than fixed colors:

* Background primary
* Background secondary
* Surface
* Elevated surface
* Border
* Text primary
* Text secondary
* Accent
* Success
* Warning
* Error
* Information

Projects may use optional accent colors.

Object types should primarily be distinguished by icons and labels rather than color alone.

## 24.3 Typography

The design should use:

* Highly readable interface font
* Monospace font for code
* Strong distinction between headings and body content
* Compact but readable metadata
* Minimum mobile body size of approximately 16 pixels

## 24.4 Spacing

Use a consistent spacing scale.

Suggested base:

* 4
* 8
* 12
* 16
* 24
* 32
* 48

## 24.5 Border radius

Suggested usage:

* Small radius for controls
* Medium radius for cards
* Larger radius for modal surfaces
* Avoid excessive pill-shaped containers

## 24.6 Iconography

Icons should be:

* Consistent
* Recognizable
* Simple
* Accompanied by labels for uncommon actions
* Large enough for mobile touch targets

## 24.7 Motion

Animations should communicate:

* Object creation
* Panel opening
* Processing state
* Dragging
* Completion
* Undo

Animations should be subtle and respect reduced-motion settings.

---

# 25. Responsive Design

## 25.1 Breakpoint philosophy

The interface should adapt based on available space rather than treating mobile as a smaller desktop.

Suggested layout categories:

* Compact mobile
* Large mobile
* Tablet
* Desktop
* Wide desktop

## 25.2 Mobile priorities

Mobile must prioritize:

* Fast capture
* Today view
* Task completion
* Event checking
* Note reading
* AI instructions
* Image upload
* Voice input
* Approval workflows

## 25.3 Desktop priorities

Desktop should prioritize:

* Multi-panel layouts
* Keyboard navigation
* Drag and drop
* Calendar planning
* Note editing
* Canvas use
* Coding
* Detailed automation monitoring

## 25.4 Touch targets

Interactive mobile elements should use adequate touch areas.

Small icon-only controls should not be placed too closely together.

## 25.5 Safe areas

The PWA must respect:

* Device notch
* Browser navigation area
* Home indicator
* Mobile keyboard
* Landscape orientation

---

# 26. Keyboard and Power-User Interaction

Suggested shortcuts:

* `Ctrl/Cmd + K`: Command palette
* `Ctrl/Cmd + Shift + C`: New capture
* `Ctrl/Cmd + N`: New note
* `Ctrl/Cmd + Shift + T`: New task
* `Ctrl/Cmd + Shift + E`: New event
* `/`: Focus search when not editing
* `Esc`: Close modal or drawer
* `Alt + Left`: Return to previous context

Shortcuts should be configurable later.

A keyboard shortcut reference should be available from the command palette.

---

# 27. Accessibility Requirements

The frontend should meet WCAG 2.2 AA principles where practical.

Requirements include:

* Full keyboard navigation
* Visible focus indicators
* Screen-reader labels
* Semantic headings
* Sufficient contrast
* Reduced-motion support
* Text scaling support
* Non-color status indicators
* Accessible form validation
* Accessible modal focus trapping
* Captions or transcripts for generated audio content
* Alt text support for uploaded images

AI-generated visual interpretations should provide text alternatives.

---

# 28. Loading, Empty, and Error States

Every major component must define:

* Initial loading state
* Incremental loading state
* Empty state
* Offline state
* Permission error
* Server error
* Processing error
* Partial success
* Retry behavior

## 28.1 Skeleton loading

Use skeletons for predictable page structures.

Do not use full-screen spinners for common navigation.

## 28.2 Optimistic updates

Low-risk actions such as task completion may update immediately and synchronize afterward.

The UI must provide rollback when synchronization fails.

## 28.3 Partial processing

When AI successfully completes only part of a request, show what succeeded and what failed.

Example:

```text
Completed:
✓ Lecture note generated
✓ Course identified

Needs attention:
! Flashcard generation failed
```

## 28.4 Offline capture

When offline, the user should still be able to:

* Type captures
* Take photographs
* Record short notes
* Draft notes
* Draft tasks

The interface should show that synchronization is pending.

---

# 29. Security and Privacy Interface

The frontend should expose meaningful security information without overwhelming the user.

## 29.1 Session management

Settings should show:

* Active sessions
* Device
* Approximate location
* Last active
* Revoke control

## 29.2 Agent permissions

The user should be able to inspect which tools each agent can access.

Example:

```text
Study Agent

Can:
✓ Read study uploads
✓ Create notes
✓ Create flashcards

Cannot:
✗ Send emails
✗ Access trading systems
✗ Run server commands
```

## 29.3 Sensitive actions

Sensitive actions must require confirmation.

Examples:

* Sending emails
* Deleting large amounts of data
* Running production commands
* Changing automation credentials
* Executing financial actions
* Granting persistent agent permissions

## 29.4 Audit access

Security-related actions must appear in Activity history.

---

# 30. Settings

Settings should be organized into:

* Profile
* Appearance
* Preferences
* Capture
* AI behavior
* Notifications
* Calendar integrations
* Storage
* Agents
* Automations
* Security
* Backups
* Data export
* Advanced
* Diagnostics

## 30.1 AI behavior settings

Possible settings:

* Auto-create low-risk tasks
* Auto-create calendar events
* Ask before modifying existing objects
* Default reminder duration
* Preferred note structure
* Preferred summary length
* Course classification rules
* AI provider selection
* Local versus external model preference

## 30.2 Data portability

The user should be able to:

* Export notes as Markdown
* Export calendar data
* Export tasks
* Download captures
* Download activity history
* Create a full backup

---

# 31. Frontend Technical Recommendations

These are recommendations rather than fixed requirements.

## 31.1 Application framework

Recommended options:

* Next.js with React
* TypeScript
* Progressive Web App support

## 31.2 Styling

Recommended options:

* Tailwind CSS
* CSS variables for theme tokens
* Component primitives from Radix UI or an equivalent accessible system

## 31.3 State management

Use separate approaches for:

* Server state
* Local interface state
* Editor state
* Offline synchronization state

Possible tools:

* TanStack Query for server state
* Zustand for small global interface state
* IndexedDB for offline capture
* Editor-specific state management for notes and canvas

## 31.4 Editor

Potential editor foundation:

* TipTap
* ProseMirror
* Lexical

The editor must support Markdown portability.

## 31.5 Calendar

Potential calendar foundation:

* FullCalendar
* React Big Calendar
* Custom calendar interface if advanced integration is required

## 31.6 Canvas

Potential canvas foundation:

* Tldraw
* Excalidraw
* Fabric.js
* Custom implementation only if necessary

## 31.7 Coding editor

Potential foundation:

* Monaco Editor
* CodeMirror

On mobile, a simplified editing surface should be used when appropriate.

---

# 32. Frontend Data Contract Requirements

Although backend implementation is outside this document, the frontend should assume every object contains common fields.

Example conceptual object:

```json
{
  "id": "object_123",
  "type": "note",
  "title": "TCP Congestion Control",
  "createdAt": "2026-07-24T09:00:00+07:00",
  "updatedAt": "2026-07-24T09:15:00+07:00",
  "createdBy": "user",
  "sourceCaptureId": "capture_456",
  "projectId": "project_789",
  "tags": ["networking", "tcp"],
  "status": "active",
  "aiGenerated": true,
  "syncState": "synced"
}
```

All important objects should support:

* Stable identifier
* Created date
* Modified date
* Creator
* Source
* Relationships
* Sync state
* Archive state
* Activity history

---

# 33. Frontend Analytics

Analytics should focus on improving usability rather than tracking personal content.

Recommended events:

* Capture submitted
* Capture abandoned
* Interpretation edited
* Interpretation rejected
* Object created
* Search performed
* Search result opened
* Task completed
* AI suggestion accepted
* AI suggestion rejected
* Processing failed
* Offline capture synchronized
* Command palette opened
* Navigation item used

Avoid collecting the full content of private notes in analytics.

---

# 34. MVP Frontend Scope

The first usable frontend should include:

## Required

* Authentication
* Responsive application shell
* Today page
* Universal text capture
* Capture inbox
* AI interpretation review card
* Tasks
* Calendar
* Vault note list
* Note editor
* Global search
* Notifications
* Activity history
* Settings
* Light and dark themes
* Mobile PWA shell
* Loading, empty, and error states

## Simplified for MVP

* Image and document upload
* Basic lecture processing result
* Basic project pages
* Basic automation monitoring
* Basic coding-agent session list

## Deferred

* Full canvas
* Advanced handwriting recognition
* Full mobile IDE
* Complex automation builder
* Graph visualization
* Multiplayer collaboration
* Financial execution controls
* Plugin marketplace
* Advanced custom dashboards

---

# 35. MVP Primary User Flow

## Flow: Natural-language scheduling

1. User opens LifeOS.

2. Today page is displayed.

3. User selects Capture.

4. User enters:

   “Tomorrow I have a meeting with Dian at 1. Remind me one hour before and add a task to review the proposal.”

5. The capture enters a processing state.

6. LifeOS shows:

   * Event: Meeting with Dian
   * Date: Tomorrow
   * Time: 1:00–2:00 PM
   * Reminder: 12:00 PM
   * Task: Review proposal
   * Related project suggestion

7. User edits the event duration.

8. User confirms.

9. Event appears in Calendar.

10. Task appears in Tasks.

11. Both appear in Today when relevant.

12. The original capture remains available.

13. Activity history records the action.

14. An Undo option remains temporarily available.

---

# 36. MVP Secondary User Flow

## Flow: Lecture slide capture

1. User opens LifeOS on mobile.

2. User selects the Capture button.

3. User takes photographs of lecture slides.

4. User optionally enters:

   “Computer Networks lecture, congestion control.”

5. Upload progress is shown.

6. LifeOS begins processing.

7. User can leave the screen.

8. A notification appears when processing finishes.

9. User opens the result.

10. LifeOS shows:

* Original photographs
* Extracted text
* Structured notes
* Summary
* Key concepts
* Suggested course
* Suggested tags

11. User corrects one section.
12. User approves the note.
13. The note appears inside the Computer Networks course workspace.
14. The original images remain linked.

---

# 37. MVP Acceptance Criteria

The frontend MVP is considered successful when:

1. The user can capture natural-language input from desktop and mobile.
2. The user can review the structured interpretation before confirmation.
3. The user can create and edit tasks.
4. The user can create and edit calendar events.
5. Tasks and events appear on the Today page.
6. The user can create, edit, and search notes.
7. Notes preserve Markdown portability.
8. Uploaded images remain connected to generated notes.
9. AI-generated information is visibly identified.
10. AI-created actions can be undone.
11. The application remains usable on a phone-sized screen.
12. The PWA can be installed on a supported mobile browser.
13. Important loading and error states are implemented.
14. The user can see recent AI and system activity.
15. External automation status can be viewed without cluttering the Today page.
16. Keyboard navigation works for the primary desktop flows.
17. The interface supports light and dark modes.
18. Private note content is not exposed in analytics.
19. The user can export notes in a portable format.
20. The interface provides confirmation for sensitive actions.

---

# 38. Recommended Initial Screen-Building Order

The frontend should be designed and implemented in this order:

## Stage 1: Foundation

1. Design tokens
2. Typography
3. Buttons
4. Inputs
5. Cards
6. Modals
7. Drawers
8. Navigation
9. Responsive shell
10. Theme system

## Stage 2: Core daily experience

1. Today page
2. Universal capture composer
3. Capture processing card
4. Capture inbox
5. Notifications
6. Activity history

## Stage 3: Action management

1. Task list
2. Task detail
3. Calendar views
4. Event detail
5. Task-event relationships

## Stage 4: Knowledge management

1. Vault
2. Note editor
3. Note detail
4. Properties
5. Backlinks
6. Search

## Stage 5: Study workflows

1. Course dashboard
2. Lecture upload
3. Processing result
4. Source comparison
5. Assignment workspace

## Stage 6: Extended modules

1. Projects
2. Coding
3. Automations
4. Canvas shell
5. Advanced settings

---

# 39. Suggested First Prototype Screens

The first high-fidelity prototype should include:

1. Desktop Today page
2. Mobile Today page
3. Desktop universal capture flow
4. Mobile camera capture flow
5. AI interpretation review card
6. Desktop Calendar week view
7. Mobile Calendar agenda view
8. Desktop Task list
9. Mobile Task list
10. Vault note list
11. Note editor
12. Lecture processing result
13. Global search overlay
14. Automation status page
15. Settings and agent permissions

---

# 40. Product Success Indicators

The frontend design is successful when the user can complete most daily actions without thinking about which module owns the information.

Qualitative indicators:

* Capturing information feels immediate.
* The user rarely needs to manually organize raw input.
* AI decisions are understandable.
* Mistakes are easy to correct.
* Mobile use does not feel secondary.
* The Today page remains calm despite many connected systems.
* The user trusts the system because sources and history remain visible.
* External automations feel connected but not intrusive.

Quantitative indicators may include:

* Time required to create a task or event
* Percentage of captures accepted without modification
* Percentage of AI interpretations manually corrected
* Number of unresolved capture items
* Search success rate
* Task completion rate
* Mobile capture completion rate
* Processing failure rate
* Number of undo actions
* Time spent navigating between modules

---

# 41. Final Frontend Direction

LifeOS should not be designed as a dashboard containing many miniature applications.

It should be designed around three primary actions:

1. Capture
2. Understand
3. Act

The frontend should make the following flow feel natural:

```text
Input
→ Interpretation
→ Review
→ Structured object
→ Connected context
→ Action
```

The universal capture system, Today page, task/calendar relationship, and knowledge vault form the core experience.

Study, coding, and automation functionality should reuse the same underlying design patterns so they feel like parts of LifeOS rather than separate products.

The first frontend milestone should therefore prioritize:

* A strong responsive application shell
* A frictionless universal capture interface
* Transparent AI interpretation
* A unified Today page
* Connected tasks, events, and notes
* Reliable mobile interaction
* Clear visual hierarchy
* Reversible actions
* Minimal clutter
