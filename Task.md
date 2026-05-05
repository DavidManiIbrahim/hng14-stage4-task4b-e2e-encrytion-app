
Frontend Wizards — Stage 4B

Stage 4B — End-to-End Encrypted App

 Objective
Build a secure messaging application that uses End-to-End Encryption (E2EE).

 What is Required
You will build a secure messaging app where:

Data is encrypted on the client
Server never sees plaintext
Only intended users can decrypt content


 Core Concept
Encryption happens:

Before sending data to backend
Decryption happens on recipient device
Backend stores only ciphertext


 System Architecture
Frontend Responsibilities:

Key generation
Key storage (secure handling)
Encryption before sending
Decryption after receiving
UI & UX
Backend Responsibilities:

Store encrypted data
Manage user identities
Handle authentication
Manage encrypted key exchange


 Required Features
 Authentication

Secure login system
Session management
JWT or secure token-based auth


 Key Management
Each user must have:

Public key
Stored on backend

Private key
Never leave client
Securely stored (IndexedDB or encrypted storage)



 Encrypted Messaging or Notes
Users should be able to:

Create encrypted message
Send to another user
Only recipient can decrypt
Server must:

Never access plaintext
Only store encrypted blobs


:four: Encryption Requirements
Use:

Web Crypto API (recommended)
AES-GCM for symmetric encryption
RSA-OAEP or ECDH for key exchange
Do NOT:

Store raw private keys in plain text
Hardcode keys


:shield: Security Expectations

No sensitive data in localStorage (unless encrypted)
Use HTTPS
Validate all inputs
Handle decryption failures gracefully
Consider replay attacks (bonus)
Consider forward secrecy (bonus)


:iphone: UI/UX Requirements

Clean secure messaging UI
Clear encrypted indicator
Loading states
Error handling
Device compatibility
No AI slop, take UI inspiration from any popular messaging application


:test_tube: Evaluation Criteria

Encryption correctly implemented
Server cannot read plaintext
Proper key management
Secure architecture decisions
Clear separation of concerns
Collaboration clarity
Documentation quality


:computer: API
Base url: https://whisperbox.koyeb.app/
Docs: https://whisperbox.koyeb.app/docs#
Implementation Guide

:package: Submission Requirements

Live demo/Interview
GitHub repository
README including:
Architecture diagram
Encryption flow explanation
Key management explanation
Security trade-offs
Known limitations

Deadline: 5th May, 2026
SUBMISSION LINK
https://docs.google.com/forms/d/e/1FAIpQLSfwkOeNFu2L-vn6VB9ctH8OFiQkFcTujxs-nwpDhG6C84WZqA/viewform?usp=publish-editor







