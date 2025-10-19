# Example: Excellent Building

## Scenario

**Context:**
- Tick 3 of quiz platform project
- Just moved to building phase
- Have clear project concept
- Priority 9 todo: "Build quiz creation form with question/answer inputs"

**Current State:**
- Phase: building
- Project structure: Next.js 15 with TypeScript
- Core infrastructure: ✅ Set up complete
- Current todo: Implement quiz creation UI

## The Building Decision

```json
{
  "thinking": "Building the quiz creation form. This needs to let users add questions with multiple choice answers. Going with a clean approach: create a reusable QuestionInput component, use React state for dynamic question list, and style with Tailwind. Will create multiple files for maintainability.",

  "results": {
    "artifact": "Multi-file implementation committed to git. Created: components/quiz/QuizCreationForm.tsx (main form component), components/quiz/QuestionInput.tsx (reusable question component), lib/types/quiz.ts (TypeScript types), app/create-quiz/page.tsx (Next.js page). Form includes add/remove questions, set answers, mark correct answer, and save quiz. Tested with multiple questions - works smoothly."
  }
}
```

## The Implementation

### Files Created

#### 1. `lib/types/quiz.ts`
```typescript
export interface QuizQuestion {
  id: string;
  question: string;
  answers: string[];
  correctAnswer: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: number;
}
```

#### 2. `components/quiz/QuestionInput.tsx`
```typescript
'use client';

interface QuestionInputProps {
  question: QuizQuestion;
  onUpdate: (question: QuizQuestion) => void;
  onDelete: () => void;
}

export function QuestionInput({ question, onUpdate, onDelete }: QuestionInputProps) {
  // Clean, focused component for a single question
  // Handles question text, 4 answers, marking correct answer
  // Delete button for removing questions

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Question input */}
      <input
        type="text"
        placeholder="Enter question..."
        value={question.question}
        onChange={(e) => onUpdate({ ...question, question: e.target.value })}
        className="w-full px-3 py-2 border rounded"
      />

      {/* Answer inputs */}
      {question.answers.map((answer, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="radio"
            checked={question.correctAnswer === i}
            onChange={() => onUpdate({ ...question, correctAnswer: i })}
          />
          <input
            type="text"
            placeholder={`Answer ${i + 1}`}
            value={answer}
            onChange={(e) => {
              const newAnswers = [...question.answers];
              newAnswers[i] = e.target.value;
              onUpdate({ ...question, answers: newAnswers });
            }}
            className="flex-1 px-3 py-2 border rounded"
          />
        </div>
      ))}

      {/* Delete button */}
      <button onClick={onDelete} className="text-red-600 text-sm">
        Delete Question
      </button>
    </div>
  );
}
```

#### 3. `components/quiz/QuizCreationForm.tsx`
```typescript
'use client';

import { useState } from 'react';
import { QuestionInput } from './QuestionInput';
import type { Quiz, QuizQuestion } from '@/lib/types/quiz';

export function QuizCreationForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const addQuestion = () => {
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      question: '',
      answers: ['', '', '', ''],
      correctAnswer: 0,
    }]);
  };

  const updateQuestion = (index: number, updated: QuizQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updated;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const saveQuiz = () => {
    // TODO: Save to database in next todo
    console.log('Saving quiz:', { title, description, questions });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Create Quiz</h1>

      {/* Quiz details */}
      <input
        type="text"
        placeholder="Quiz Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-3 text-xl border rounded"
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-4 py-3 border rounded"
        rows={3}
      />

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionInput
            key={q.id}
            question={q}
            onUpdate={(updated) => updateQuestion(i, updated)}
            onDelete={() => deleteQuestion(i)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={addQuestion}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add Question
        </button>
        <button
          onClick={saveQuiz}
          className="px-4 py-2 bg-green-600 text-white rounded"
          disabled={questions.length === 0}
        >
          Save Quiz
        </button>
      </div>
    </div>
  );
}
```

#### 4. `app/create-quiz/page.tsx`
```typescript
import { QuizCreationForm } from '@/components/quiz/QuizCreationForm';

export default function CreateQuizPage() {
  return <QuizCreationForm />;
}
```

### Git Commits Made

```bash
# First commit: Types
git add lib/types/quiz.ts
git commit -m "feat: add quiz and question TypeScript types"
git push origin agent-workspace

# Second commit: Question component
git add components/quiz/QuestionInput.tsx
git commit -m "feat: create QuestionInput component for quiz questions"
git push origin agent-workspace

# Third commit: Main form
git add components/quiz/QuizCreationForm.tsx app/create-quiz/page.tsx
git commit -m "feat: implement quiz creation form with dynamic questions"
git push origin agent-workspace
```

## Why This Is Excellent

### ✅ Multi-File Architecture
- Separated concerns into logical files
- Reusable components (`QuestionInput`)
- Shared types (`quiz.ts`)
- **Lesson**: Don't limit yourself to single files!

### ✅ TypeScript for Type Safety
- Defined interfaces for Quiz and QuizQuestion
- Type-safe props and state
- Prevents bugs at compile time
- **Lesson**: Use TypeScript in larger projects

### ✅ Modern React Patterns
- Functional components with hooks
- Proper state management
- Event handlers with clear intent
- **Lesson**: Use contemporary best practices

### ✅ Clean, Readable Code
- Descriptive variable names
- Clear function names
- Simple logic, easy to understand
- **Lesson**: Code should be self-documenting

### ✅ Incremental Commits
- 3 separate commits for logical units
- Each commit is one focused change
- Semantic commit messages
- **Lesson**: Commit frequently and clearly

### ✅ Proper Testing
- Manually tested before committing
- Verified add/delete questions works
- Tested with multiple questions
- **Lesson**: Test before committing

### ✅ Focused on Todo
- Built exactly what the todo asked for
- Didn't add extra features
- Complete implementation
- **Lesson**: Stay focused, no scope creep

### ✅ Hackathon-Appropriate Quality
- Not over-engineered (no validation yet)
- Works well and looks good
- Room for polish later
- **Lesson**: Good enough is good enough

## Outcomes

**Immediate:**
- Working quiz creation form
- Clean, maintainable codebase
- All commits pushed successfully
- Ready for next todo

**Next Steps:**
- Next todo: Connect to database (already have types!)
- Easy to add validation later (component is ready)
- Can reuse `QuestionInput` for editing

**Demo Day:**
- Clean, professional-looking form
- No bugs in quiz creation
- Easy to show and explain

## Key Takeaways

1. **Multi-file is better**: Break code into logical components
2. **TypeScript helps**: Define types early, use them everywhere
3. **Commit incrementally**: Small, focused commits with clear messages
4. **Test before committing**: Make sure it works!
5. **Modern patterns**: Use current best practices
6. **Stay focused**: Build what the todo asks for, nothing more
7. **Good enough works**: Don't over-engineer for a hackathon

## Anti-Pattern Version (What NOT to Do)

```json
{
  "thinking": "Just gonna throw together a quick form in one file.",

  "results": {
    "artifact": "<!DOCTYPE html><html><body><form><input type=\"text\" id=\"question1\"><input type=\"text\" id=\"question2\"><input type=\"text\" id=\"question3\"><button onclick=\"console.log('saved')\">Save</button></form></body></html>"
  }
}
```

**Why this fails:**
- ❌ Single HTML file with inline everything
- ❌ No component structure
- ❌ Hard-coded 3 questions (can't add/remove)
- ❌ No type safety
- ❌ Poor user experience
- ❌ Hard to extend or maintain

## Advanced Techniques Demonstrated

### 1. Component Composition
```
QuizCreationForm (container)
  └── QuestionInput (reusable component) x N
```

### 2. State Management
- Parent component manages state
- Child components receive props and callbacks
- Clean data flow

### 3. Dynamic Lists
- Add questions dynamically
- Remove questions with filter
- Update individual questions

### 4. TypeScript Interfaces
- Shared types between components
- Type-safe props
- Self-documenting code

## Application to Your Project

When building features:

1. **Plan the structure**: What components do you need?
2. **Create types first**: Define your data structures
3. **Build incrementally**: One component at a time
4. **Test as you go**: Don't wait until the end
5. **Commit frequently**: Every working unit of code
6. **Keep it clean**: Readable > clever

Remember: **Multi-file projects with clean architecture are not harder - they're better!**
