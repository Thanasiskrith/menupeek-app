// This file is temporarily blank to resolve build issues.
// A mock 'ai' object is created to prevent build-time errors in other files.
// When AI features are re-enabled, this file will be restored.

const ai = {
  defineFlow: () => async () => {
    throw new Error('AI features are temporarily disabled.');
  },
  definePrompt: () => async () => {
    throw new Error('AI features are temporarily disabled.');
  },
};

export { ai };
