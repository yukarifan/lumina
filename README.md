# Lumina - Interactive Learning Platform

Lumina is an advanced learning platform that enables interactive document analysis, real-time collaboration, and AI-powered assistance for both students and instructors.

## Features

- **Interactive PDF Viewer**
  - Smooth PDF navigation with zoom controls
  - Multi-page support with thumbnail preview
  - Responsive layout with adjustable sidebar

- **Smart Annotations**
  - Text selection and highlighting
  - AI-powered analysis of selected content
  - Heat map visualization of student engagement
  - Interactive hint bulbs for additional context

- **AI Integration**
  - Real-time content analysis
  - Mathematical formula support with KaTeX
  - Contextual explanations and insights
  - Conversation history tracking

- **User Management**
  - Role-based access (Student/Instructor)
  - Secure authentication
  - Personalized user experience

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
OPENAI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **PDF Processing**: PDF.js
- **Math Rendering**: KaTeX
- **AI Integration**: OpenAI GPT-4
- **Authentication**: Custom auth system

## Project Structure

```
src/
  ├── app/              # Next.js app directory
  ├── components/       # Reusable React components
  ├── types/           # TypeScript type definitions
  ├── utils/           # Utility functions
  └── data/            # Data storage
```

## Development

- Use `npm run dev` for development with hot-reload
- Use `npm run build` for production builds
- Use `npm run lint` for code linting

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.