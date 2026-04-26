export interface LearningResource {
  title: string
  url: string
  platform: 'udemy' | 'youtube' | 'coursera' | 'freecodecamp' | 'github' | 'docs' | 'project'
  type: 'course' | 'video' | 'tutorial' | 'project' | 'playlist'
  durationHours: number
  level: 'beginner' | 'intermediate' | 'advanced'
  free: boolean
  rating?: number
}

export const LEARNING_RESOURCES: Record<string, LearningResource[]> = {
  'React': [
    { title: 'React - The Complete Guide 2024', url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/', platform: 'udemy', type: 'course', durationHours: 68, level: 'beginner', free: false, rating: 4.6 },
    { title: 'React Full Course for Free 2024', url: 'https://www.youtube.com/watch?v=CgkZ7MvWUAA', platform: 'youtube', type: 'video', durationHours: 10, level: 'beginner', free: true },
    { title: 'React Hooks In-Depth', url: 'https://www.youtube.com/watch?v=TNhaISOUy6Q', platform: 'youtube', type: 'video', durationHours: 2, level: 'intermediate', free: true },
    { title: 'React Official Tutorial', url: 'https://react.dev/learn', platform: 'docs', type: 'tutorial', durationHours: 6, level: 'beginner', free: true },
  ],
  'Node.js': [
    { title: 'NodeJS - The Complete Guide', url: 'https://www.udemy.com/course/nodejs-the-complete-guide/', platform: 'udemy', type: 'course', durationHours: 40, level: 'intermediate', free: false, rating: 4.7 },
    { title: 'Node.js Crash Course', url: 'https://www.youtube.com/watch?v=32M1al-Y6Ag', platform: 'youtube', type: 'video', durationHours: 3, level: 'beginner', free: true },
    { title: 'Build REST API with Node + Express', url: 'https://www.youtube.com/watch?v=fgTGADljAeg', platform: 'youtube', type: 'video', durationHours: 1, level: 'beginner', free: true },
  ],
  'TypeScript': [
    { title: 'Understanding TypeScript 2024', url: 'https://www.udemy.com/course/understanding-typescript/', platform: 'udemy', type: 'course', durationHours: 22, level: 'intermediate', free: false, rating: 4.7 },
    { title: 'TypeScript Full Course for Beginners', url: 'https://www.youtube.com/watch?v=30LWjhZzg50', platform: 'youtube', type: 'video', durationHours: 8, level: 'beginner', free: true },
  ],
  'Go': [
    { title: 'Go: The Complete Developer Guide', url: 'https://www.udemy.com/course/go-the-complete-developers-guide/', platform: 'udemy', type: 'course', durationHours: 9, level: 'intermediate', free: false, rating: 4.6 },
    { title: 'Golang Tutorial for Beginners Full Course', url: 'https://www.youtube.com/watch?v=un6ZyFkqFKo', platform: 'youtube', type: 'video', durationHours: 7, level: 'beginner', free: true },
    { title: 'Go Tour (Official)', url: 'https://go.dev/tour/', platform: 'docs', type: 'tutorial', durationHours: 8, level: 'beginner', free: true },
  ],
  'Rust': [
    { title: 'Ultimate Rust Crash Course', url: 'https://www.udemy.com/course/ultimate-rust-crash-course/', platform: 'udemy', type: 'course', durationHours: 6, level: 'intermediate', free: false, rating: 4.7 },
    { title: 'Rust Full Course', url: 'https://www.youtube.com/watch?v=BpPEoZW5IiY', platform: 'youtube', type: 'video', durationHours: 12, level: 'beginner', free: true },
    { title: 'The Rust Book (Official)', url: 'https://doc.rust-lang.org/book/', platform: 'docs', type: 'tutorial', durationHours: 40, level: 'intermediate', free: true },
    { title: 'Rustlings exercises', url: 'https://github.com/rust-lang/rustlings', platform: 'github', type: 'project', durationHours: 20, level: 'beginner', free: true },
  ],
  'Python': [
    { title: '100 Days of Code: Python Pro Bootcamp', url: 'https://www.udemy.com/course/100-days-of-code/', platform: 'udemy', type: 'course', durationHours: 60, level: 'beginner', free: false, rating: 4.7 },
    { title: 'Python in 1 Hour', url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8', platform: 'youtube', type: 'video', durationHours: 1, level: 'beginner', free: true },
    { title: 'FastAPI Full Course', url: 'https://www.youtube.com/watch?v=0sOvCWFmrtA', platform: 'youtube', type: 'video', durationHours: 6, level: 'intermediate', free: true },
  ],
  'AWS': [
    { title: 'Ultimate AWS Certified Solutions Architect 2024', url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/', platform: 'udemy', type: 'course', durationHours: 45, level: 'intermediate', free: false, rating: 4.8 },
    { title: 'AWS Full Course 2024', url: 'https://www.youtube.com/watch?v=ZB5ONbD_SMY', platform: 'youtube', type: 'video', durationHours: 10, level: 'beginner', free: true },
  ],
  'Kubernetes': [
    { title: 'Kubernetes for the Absolute Beginners', url: 'https://www.udemy.com/course/learn-kubernetes/', platform: 'udemy', type: 'course', durationHours: 9, level: 'beginner', free: false, rating: 4.7 },
    { title: 'Kubernetes Full Beginners Tutorial', url: 'https://www.youtube.com/watch?v=d6WC5n9G_sM', platform: 'youtube', type: 'video', durationHours: 4, level: 'beginner', free: true },
    { title: 'Build a Kubernetes Operator', url: 'https://www.youtube.com/watch?v=08O9eLJGQRM', platform: 'youtube', type: 'project', durationHours: 3, level: 'advanced', free: true },
  ],
  'System Design': [
    { title: 'Grokking the System Design Interview', url: 'https://www.educative.io/courses/grokking-modern-system-design-interview-for-engineers-managers', platform: 'docs', type: 'course', durationHours: 30, level: 'advanced', free: false },
    { title: 'System Design Full Course (Gaurav Sen)', url: 'https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX', platform: 'youtube', type: 'playlist', durationHours: 12, level: 'intermediate', free: true },
    { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', platform: 'github', type: 'tutorial', durationHours: 20, level: 'intermediate', free: true },
    { title: 'Design URL Shortener', url: 'https://www.youtube.com/watch?v=fMZMm_0ZhK4', platform: 'youtube', type: 'project', durationHours: 2, level: 'intermediate', free: true },
  ],
  'GenAI / LLMs': [
    { title: 'ChatGPT Prompt Engineering for Developers', url: 'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/', platform: 'docs', type: 'course', durationHours: 2, level: 'beginner', free: true },
    { title: 'LangChain for LLM Application Development', url: 'https://www.deeplearning.ai/short-courses/langchain-for-llm-application-development/', platform: 'docs', type: 'course', durationHours: 3, level: 'intermediate', free: true },
    { title: 'Build a RAG App with LangChain + OpenAI', url: 'https://www.youtube.com/watch?v=tcqEUSNCn8I', platform: 'youtube', type: 'project', durationHours: 2, level: 'intermediate', free: true },
    { title: 'Hugging Face NLP Course', url: 'https://huggingface.co/learn/nlp-course/chapter1/1', platform: 'docs', type: 'course', durationHours: 20, level: 'intermediate', free: true },
  ],
  'Data Engineering': [
    { title: 'Data Engineering Zoomcamp', url: 'https://github.com/DataTalksClub/data-engineering-zoomcamp', platform: 'github', type: 'course', durationHours: 60, level: 'intermediate', free: true },
    { title: 'Apache Kafka Full Course', url: 'https://www.youtube.com/watch?v=R873BlNVUB4', platform: 'youtube', type: 'video', durationHours: 4, level: 'intermediate', free: true },
    { title: 'dbt Full Tutorial', url: 'https://www.youtube.com/watch?v=5rNquRnNb4E', platform: 'youtube', type: 'video', durationHours: 4, level: 'intermediate', free: true },
  ],
  'DSA': [
    { title: 'Master the Coding Interview: DSA', url: 'https://www.udemy.com/course/master-the-coding-interview-data-structures-algorithms/', platform: 'udemy', type: 'course', durationHours: 20, level: 'intermediate', free: false, rating: 4.7 },
    { title: 'DSA Full Course - Striver A to Z', url: 'https://www.youtube.com/watch?v=rZ41y93P2Qo', platform: 'youtube', type: 'playlist', durationHours: 50, level: 'intermediate', free: true },
    { title: 'LeetCode Top 150 Interview Questions', url: 'https://leetcode.com/studyplan/top-interview-150/', platform: 'docs', type: 'project', durationHours: 40, level: 'intermediate', free: true },
  ],
}

export const HANDS_ON_PROJECTS: Record<string, { title: string; description: string; skills: string[]; difficulty: string; link: string; estimatedHours: number }[]> = {
  backend: [
    { title: 'URL Shortener (Bitly clone)', description: 'Build with Go/Rust, Redis caching, PostgreSQL, Docker. Deploy to Railway.', skills: ['Go', 'Redis', 'PostgreSQL', 'Docker'], difficulty: 'Medium', link: 'https://github.com/topics/url-shortener', estimatedHours: 15 },
    { title: 'Real-time Chat App', description: 'WebSockets, Pub/Sub with Redis, user auth, rooms. Node.js or Go backend.', skills: ['Node.js', 'WebSockets', 'Redis'], difficulty: 'Medium', link: 'https://socket.io/get-started/chat', estimatedHours: 20 },
    { title: 'Rate Limiter Library', description: 'Implement token bucket, sliding window, fixed window algorithms. Publish as npm/Go module.', skills: ['Go', 'Algorithms'], difficulty: 'Hard', link: 'https://github.com/topics/rate-limiter', estimatedHours: 10 },
    { title: 'Distributed Job Queue', description: 'Build BullMQ-style queue with priorities, retries, dead letters.', skills: ['Node.js', 'Redis', 'System Design'], difficulty: 'Hard', link: 'https://docs.bullmq.io/', estimatedHours: 25 },
  ],
  ai: [
    { title: 'Personal RAG Chatbot', description: 'Upload PDFs, ask questions. LangChain + OpenAI + Pinecone. Full UI.', skills: ['Python', 'LangChain', 'OpenAI', 'Vector DB'], difficulty: 'Medium', link: 'https://python.langchain.com/docs/tutorials/rag/', estimatedHours: 12 },
    { title: 'AI Code Reviewer', description: 'GitHub webhook → GPT reviews every PR. Real open source contribution.', skills: ['Python', 'GitHub API', 'OpenAI'], difficulty: 'Medium', link: 'https://docs.github.com/en/webhooks', estimatedHours: 8 },
    { title: 'Voice-to-SQL App', description: 'Speak a question → Whisper → GPT generates SQL → runs on your DB.', skills: ['Python', 'OpenAI', 'React', 'SQL'], difficulty: 'Hard', link: 'https://platform.openai.com/docs/guides/speech-to-text', estimatedHours: 15 },
  ],
  devops: [
    { title: 'Kubernetes Homelab Cluster', description: 'k3s on VPS. Deploy real apps, Prometheus + Grafana monitoring.', skills: ['Kubernetes', 'Docker', 'Prometheus'], difficulty: 'Hard', link: 'https://k3s.io/', estimatedHours: 20 },
    { title: 'CI/CD Pipeline from Scratch', description: 'GitHub Actions → Docker build → ECR push → ECS deploy.', skills: ['GitHub Actions', 'Docker', 'AWS'], difficulty: 'Medium', link: 'https://docs.github.com/en/actions', estimatedHours: 8 },
    { title: 'Terraform IaC on AWS', description: 'Provision VPC, ECS, RDS, S3 with Terraform.', skills: ['Terraform', 'AWS', 'IaC'], difficulty: 'Medium', link: 'https://developer.hashicorp.com/terraform/tutorials', estimatedHours: 15 },
  ],
  frontend: [
    { title: 'Real-time Collaborative Editor', description: 'Notion-like editor with CRDT. Yjs + React + WebSockets.', skills: ['React', 'WebSockets', 'Yjs'], difficulty: 'Hard', link: 'https://docs.yjs.dev/', estimatedHours: 25 },
    { title: 'Design System Component Library', description: 'Build and publish npm component library. TypeScript + Storybook.', skills: ['TypeScript', 'React', 'Storybook'], difficulty: 'Medium', link: 'https://storybook.js.org/docs/get-started', estimatedHours: 20 },
  ],
}
