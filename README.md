# Bolt.droid

<div align="center">
  <img src="/public/logo-dark-styled.png#gh-dark-mode-only" alt="Bolt.droid Logo" width="300" />
  <img src="/public/logo-light-styled.png#gh-light-mode-only" alt="Bolt.droid Logo" width="300" />

  <p>An AI-powered mobile development assistant for Android</p>

  <p>
    <a href="https://github.com/stackblitz-labs/bolt.diy/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/stackblitz-labs/bolt.diy" alt="License" />
    </a>
    <a href="https://github.com/stackblitz-labs/bolt.diy/stargazers">
      <img src="https://img.shields.io/github/stars/stackblitz-labs/bolt.diy" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/stackblitz-labs/bolt.diy/network/members">
      <img src="https://img.shields.io/github/forks/stackblitz-labs/bolt.diy" alt="GitHub Forks" />
    </a>
    <a href="https://github.com/stackblitz-labs/bolt.diy/issues">
      <img src="https://img.shields.io/github/issues/stackblitz-labs/bolt.diy" alt="GitHub Issues" />
    </a>
  </p>
</div>

## 🌟 Features

### 🤖 AI Capabilities
- Multiple AI Provider Support:
  - OpenAI, Anthropic, Groq
  - Google Gemini, Mistral, xAI
  - HuggingFace, DeepSeek, Cohere
  - OpenRouter, Together AI
  - Local models via Ollama & LMStudio
- On-device Neural Network capabilities
- Context-aware code generation
- Intelligent code completion
- Project scaffolding and templates

### 📱 Mobile Features
- Offline support with auto-sync
- Local model integration
- Biometric authentication
- Neural network processing
- Background task management
- Secure data encryption
- Efficient storage management
- Backup & restore functionality

### 🔒 Security & Privacy
- Local processing
- Biometric authentication
- Encrypted storage
- Secure API key management
- Session management
- Data backup encryption

## 🚀 Quick Start

### Installation

1. Download from Google Play Store (coming soon)
2. Or build from source:
```bash
git clone https://github.com/stackblitz-labs/bolt.diy.git
cd bolt.diy
pnpm install
pnpm run build:android
```

### Development Setup

1. Clone and setup:
```bash
git clone https://github.com/stackblitz-labs/bolt.diy.git
cd bolt.diy
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

3. Start development:
```bash
# Start Android development
pnpm run dev:android
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file with your API keys:

```env
# OpenAI
OPENAI_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Google
GOOGLE_GENERATIVE_AI_API_KEY=

# HuggingFace
HuggingFace_API_KEY=

# Groq
GROQ_API_KEY=

# Mistral
MISTRAL_API_KEY=

# OpenRouter
OPEN_ROUTER_API_KEY=

# Perplexity
PERPLEXITY_API_KEY=

# Together AI
TOGETHER_API_KEY=
TOGETHER_API_BASE_URL=

# xAI
XAI_API_KEY=

# Ollama
OLLAMA_API_BASE_URL=

# AWS Bedrock
AWS_BEDROCK_CONFIG=
```

## 🛠️ Tech Stack

### Android App
- **Framework**: React Native
- **Neural Network**: TensorFlow Lite
- **State Management**: Nanostores
- **Storage**: AsyncStorage + Encryption
- **Security**: Biometrics, Keychain
- **Background Tasks**: Background Actions
- **File System**: React Native FS
- **Compression**: GZIP
- **UI**: Native Components

## 📁 Project Structure
```
bolt.droid/
├── app/                # Main application code
│   ├── components/     # React Native components
│   ├── lib/           # Core libraries
│   ├── screens/       # Mobile screens
│   ├── stores/        # State management
│   ├── styles/        # Global styles
│   ├── types/         # TypeScript types
│   └── utils/         # Utilities
├── android/           # Android native code
├── docs/             # Documentation
└── scripts/          # Build scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

Please read our [Contributing Guidelines](CONTRIBUTING.md) for more details.

## 📝 Development Guidelines

- Follow React Native best practices
- Write clean, maintainable code
- Add appropriate comments and documentation
- Include tests for new features
- Follow the existing code style
- Use conventional commit messages

## 🔒 Security Guidelines

- Never store API keys in code
- Use secure storage for sensitive data
- Implement proper authentication
- Follow Android security best practices
- Handle permissions appropriately
- Encrypt all sensitive data

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://docs.bolt.diy)
- 💬 [Discord Community](https://discord.gg/bolt-diy)
- 🐛 [Issue Tracker](https://github.com/stackblitz-labs/bolt.diy/issues)
- 📧 [Email Support](mailto:support@bolt.diy)

## 🙏 Acknowledgments

Special thanks to all our contributors and the open-source community.