import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const logger = createScopedLogger('CodeExecutor');

interface ExecutionConfig {
  language: string;
  timeout: number;
  memoryLimit: number;
  args?: string[];
  env?: Record<string, string>;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsage: number;
}

export class CodeExecutor {
  private static instance: CodeExecutor;
  private readonly codeDir = `${RNFS.DocumentDirectoryPath}/code_execution`;
  
  private supportedLanguages = new Set([
    'javascript',
    'typescript',
    'python'
  ]);

  private constructor() {}

  static getInstance(): CodeExecutor {
    if (!CodeExecutor.instance) {
      CodeExecutor.instance = new CodeExecutor();
    }
    return CodeExecutor.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create code execution directory
      const exists = await RNFS.exists(this.codeDir);
      if (!exists) {
        await RNFS.mkdir(this.codeDir);
      }

      logger.info('Code executor initialized');
    } catch (error) {
      logger.error('Failed to initialize code executor:', error);
      throw error;
    }
  }

  async executeCode(
    code: string,
    language: string,
    config?: Partial<ExecutionConfig>
  ): Promise<ExecutionResult> {
    try {
      if (!this.supportedLanguages.has(language)) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Create temporary file
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const extension = this.getFileExtension(language);
      const filepath = `${this.codeDir}/${filename}.${extension}`;

      // Write code to file
      await RNFS.writeFile(filepath, code, 'utf8');

      // Execute code
      const result = await NativeModules.CodeExecutorModule.execute({
        filepath,
        language,
        timeout: config?.timeout || 5000,
        memoryLimit: config?.memoryLimit || 100 * 1024 * 1024, // 100MB
        args: config?.args || [],
        env: config?.env || {}
      });

      // Clean up
      await RNFS.unlink(filepath);

      logger.info('Code executed successfully');
      return result;
    } catch (error) {
      logger.error('Failed to execute code:', error);
      throw error;
    }
  }

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py'
    };
    return extensions[language] || language;
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.supportedLanguages);
  }

  isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.has(language);
  }
}