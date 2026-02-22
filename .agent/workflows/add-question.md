---
description: How to add questions to a quiz pack
---

# Adding Questions to Quiz Pack

## Via Admin Dashboard (UI)

1. Login as admin
2. Go to "Question Banks" tab
3. Select a Quiz Pack from dropdown
4. Options:
   - **Manual**: Click "Add Question" button, fill form
   - **AI Generate**: Use AI generation feature
   - **Excel Import**: Upload .xlsx file with columns: text, optionA, optionB, optionC, optionD, correctAnswer, stimulus (optional)

## Via Database (Prisma)

1. Open Prisma Studio:
```bash
npx prisma studio
```

2. Navigate to Question model
3. Add new record with:
   - `packId`: UUID of the QuizPack
   - `variant`: Question variant (e.g., "A", "B")
   - `text`: Question text (HTML supported)
   - `stimulus`: Optional stimulus/passage (HTML supported)
   - `options`: JSON array of options, e.g., `["Option A", "Option B", "Option C", "Option D"]`
   - `correctAnswer`: The correct option text (must match exactly)

## Via Server Action

Use `createQuestion` action in `app/actions.ts`:
```typescript
await createQuestion({
  packId: "pack-uuid",
  variant: "A",
  text: "<p>What is 2 + 2?</p>",
  stimulus: "",
  options: ["3", "4", "5", "6"],
  correctAnswer: "4"
});
```
