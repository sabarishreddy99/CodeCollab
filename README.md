# CodeCollab

CodeCollab is a real-time collaborative code editor that allows multiple users to write and modify code simultaneously, similar to Google Docs but for coding. Built for seamless teamwork, CodeCollab ensures efficient collaboration with live code updates, a dynamic execution environment, and version control.

## 📺 Demo Video
[![CodeCollab Demo](https://img.youtube.com/vi/vL2KroJkakg/0.jpg)](https://youtu.be/vL2KroJkakg)

## 🚀 Features
- **Real-time Collaboration**: Work together on the same codebase with instant updates.
- **Multi-language Support**: Supports Python, C++, JavaScript, and more.
- **Code Execution**: Run code directly within the platform.
- **User Authentication**: Secure login and user-specific workspaces.
- **Version Control**: Track changes and revert to previous versions.
- **Syntax Highlighting**: Enhances readability and debugging with proper code styling.
- **Snapshot and Session Management**: Save snapshots of code states and restore previous versions.

## 🛠 Tech Stack
- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Node.js, Express.js, Python, Flask
- **Database**: Amazon DynamoDB
- **Real-time Collaboration**: WebSockets (Socket.io), Y.js (CRDT-based synchronization)
- **Code Execution**: AWS ECS, AWS Lambda, Docker Containers
- **Storage & Versioning**: Amazon S3, Snapshot Service
- **Authentication**: OAuth, JWT
- **Monitoring & Scaling**: AWS CloudWatch, Load Balancer, AWS Fargate

## 📸 Screenshots
### System Architecture
![Collaborative Code Editor architecture](/images/Collaborative%20Code%20Editor%20architecture.jpeg)
### Login Page
![Login](/images/login.jpeg)
### Code Editor Interface
![Collaboration](/images/collaboration.jpeg)
### Real-Time Code Execution
![Code Execution](/images/code_execution.jpeg)
### Snapshot Saved
![Snapshot Saved](/images/snapshot_saved.jpeg)
### Version History
![Version History](/images/version_history.jpeg)

## 💻 Setup Instructions
1. **Clone the repository**
   ```sh
   git clone https://github.com/sabarishreddy99/CodeCollab.git
   cd CodeCollab
   ```
2. **Install dependencies**
   ```sh
   npm install
   ```
3. **Start the development server**
   ```sh
   npm start
   ```

## 🎯 Contribution Guidelines
1. Fork the repository.
2. Create a new branch (`feature-xyz`).
3. Commit your changes.
4. Push to your fork and submit a Pull Request.

## 📜 License
This project is licensed under the MIT License.
