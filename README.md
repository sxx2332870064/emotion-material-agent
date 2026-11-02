# Emotion-to-Material Exploration Assistant

An agent-based educational application for art and digital media students in an early material-experimentation stage.

The application does not design a finished artwork. It helps the student develop three small controlled experiments using confirmed digital tools, physical materials, workspace, skills, time, and safety limits.

## Intended users

Art and digital media students who are exploring an emotion or concept through digital and physical material testing.

## Agent architecture

The application uses one Gemini decision agent.

The agent may select one of four actions:

- `ASK_CLARIFICATION`
- `GENERATE_EXPERIMENTS`
- `REQUEST_HUMAN_REVIEW`
- `COMPLETE`

Application code independently handles:

- confirmed-resource filtering;
- workspace compatibility;
- hard safety boundaries;
- output validation;
- one repair attempt;
- stopping after failed validation;
- API and timeout errors.

A multi-agent system was not used because the task is linear and all decisions use the same student input and experiment context.

## Technology

- HTML, CSS, and browser JavaScript
- Node.js
- Express
- Gemini Interactions REST API
- Server-side environment variable for the API key

## Secure credential setup

Create a local `.env` file:

```env
GEMINI_API_KEY=your_api_key_here