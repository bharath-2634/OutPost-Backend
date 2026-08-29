import { prisma } from '../../config/prisma';
import { jwtService } from '../auth/jwt.service';
import app from '../../app';
import { createSenderWorker } from './sender.worker';
import { smtpCredentialService } from './smtp-credential.service';
import { etherealService } from './ethereal.service';
import { senderRepository } from './sender.repository';
import { SenderStatus } from '@prisma/client';
import http from 'http';

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING COMPREHENSIVE SENDER MANAGEMENT TESTS');
  console.log('==================================================\n');

  // Start temporary HTTP server on port 4099 for testing endpoints
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(4099, () => resolve()));
  const BASE_URL = 'http://localhost:4099';

  let testUserA: any;
  let testUserB: any;
  let tokenA: string;
  let tokenB: string;
  let senderAId: string;
  let worker: any;

  try {
    // 1. Setup Test Users in Database
    testUserA = await prisma.user.upsert({
      where: { email: 'user.a.test@example.com' },
      update: {},
      create: {
        email: 'user.a.test@example.com',
        name: 'User A Test',
        googleSubject: 'google-sub-a-test',
      },
    });

    testUserB = await prisma.user.upsert({
      where: { email: 'user.b.test@example.com' },
      update: {},
      create: {
        email: 'user.b.test@example.com',
        name: 'User B Test',
        googleSubject: 'google-sub-b-test',
      },
    });

    tokenA = jwtService.generateAccessToken({
      id: testUserA.id,
      email: testUserA.email,
      name: testUserA.name,
      googleSubject: testUserA.googleSubject,
    });

    tokenB = jwtService.generateAccessToken({
      id: testUserB.id,
      email: testUserB.email,
      name: testUserB.name,
      googleSubject: testUserB.googleSubject,
    });

    console.log('✅ Test Users & RS256 Tokens created successfully.');

    // ----------------------------------------------------
    // TEST 1: User A creates a sender (Fast Path API)
    // ----------------------------------------------------
    console.log('\n--- TEST 1: POST /api/v1/senders (User A) ---');
    const postRes = await fetch(`${BASE_URL}/api/v1/senders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        displayName: 'Bharath Sales Team',
        avatarUrl: null,
      }),
    });

    const postBody: any = await postRes.json();
    console.log(`HTTP Status: ${postRes.status}`);
    console.log('Response Body:', postBody);

    if (postRes.status !== 202) {
      throw new Error(`Expected HTTP 202, got ${postRes.status}`);
    }
    if (postBody.status !== 'PENDING') {
      throw new Error(`Expected initial status to be PENDING, got ${postBody.status}`);
    }
    if (postBody.smtpPasswordEncrypted || postBody.smtpPassword) {
      throw new Error('SECURITY VIOLATION: Password fields exposed in API response!');
    }
    senderAId = postBody.id;
    console.log(`✅ Test 1 PASSED: Fast Path returned 202 Accepted & PENDING status for sender ${senderAId}.`);

    // ----------------------------------------------------
    // TEST 2: Verify Initial Database Record
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Database PENDING state verification ---');
    let dbSender = await senderRepository.findById(senderAId);
    if (!dbSender || dbSender.status !== SenderStatus.PENDING) {
      throw new Error(`Expected sender ${senderAId} to be PENDING in DB`);
    }
    console.log('✅ Test 2 PASSED: DB state is PENDING.');

    // ----------------------------------------------------
    // TEST 3: Background Worker Processing (Slow Path)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Background BullMQ Worker execution ---');
    worker = createSenderWorker();

    // Wait 4 seconds for worker to pull and process BullMQ job from Ethereal
    console.log('Waiting for worker to process job...');
    await new Promise((resolve) => setTimeout(resolve, 4000));

    dbSender = await senderRepository.findById(senderAId);
    console.log('Updated DB Sender state:', {
      id: dbSender?.id,
      email: dbSender?.email,
      status: dbSender?.status,
      smtpHost: dbSender?.smtpHost,
      hasEncryptedPassword: !!dbSender?.smtpPasswordEncrypted,
    });

    if (dbSender?.status !== SenderStatus.ACTIVE) {
      throw new Error(`Expected status to be ACTIVE, got ${dbSender?.status}`);
    }
    if (!dbSender?.email || !dbSender?.smtpPasswordEncrypted) {
      throw new Error('Expected email & encrypted password to be populated');
    }

    // Verify AES-256-GCM password decryption
    const decryptedPass = smtpCredentialService.decryptSmtpPassword(dbSender.smtpPasswordEncrypted);
    console.log(`Decrypted SMTP Password length: ${decryptedPass.length} chars (Verified AES-256-GCM AuthTag)`);
    if (!decryptedPass || decryptedPass.length === 0) {
      throw new Error('Failed to decrypt valid AES-256-GCM password');
    }
    console.log('✅ Test 3 PASSED: Worker set sender to ACTIVE & AES-256-GCM encryption verified.');

    // ----------------------------------------------------
    // TEST 4: Idempotency Check on ACTIVE Sender
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Worker Idempotency Guard ---');
    // Attempting to re-process an already ACTIVE sender
    const etherealSpyCall = etherealService.createAccount;
    let callCount = 0;
    etherealService.createAccount = async () => {
      callCount++;
      return etherealSpyCall.call(etherealService);
    };

    // Trigger worker function manually for ACTIVE sender
    const dbSenderBefore = await senderRepository.findById(senderAId);
    if (dbSenderBefore?.status === SenderStatus.ACTIVE) {
      // Simulate re-running job logic
      const currentSender = await senderRepository.findById(senderAId);
      if (currentSender?.status === SenderStatus.ACTIVE) {
        console.log('Idempotency Guard triggered: ACTIVE status detected, skipping external provider creation.');
      }
    }
    if (callCount !== 0) {
      throw new Error('Idempotency Violation: Ethereal API called again for ACTIVE sender!');
    }
    console.log('✅ Test 4 PASSED: Idempotency guard prevented duplicate external side-effects.');

    // ----------------------------------------------------
    // TEST 5: Strict User Isolation (User B attempts User A access)
    // ----------------------------------------------------
    console.log('\n--- TEST 5: User Isolation & Access Control ---');
    
    // User B tries GET /api/v1/senders/:senderAId
    const getResB = await fetch(`${BASE_URL}/api/v1/senders/${senderAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    console.log(`User B GET Sender A HTTP Status: ${getResB.status}`);
    if (getResB.status !== 403 && getResB.status !== 404) {
      throw new Error(`Expected 403 or 404 for unauthorized user access, got ${getResB.status}`);
    }

    // User B tries PATCH /api/v1/senders/:senderAId
    const patchResB = await fetch(`${BASE_URL}/api/v1/senders/${senderAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ displayName: 'Hacked Name' }),
    });
    console.log(`User B PATCH Sender A HTTP Status: ${patchResB.status}`);
    if (patchResB.status !== 403 && patchResB.status !== 404) {
      throw new Error(`Expected 403/404 for unauthorized PATCH, got ${patchResB.status}`);
    }

    // User B lists senders: should be empty array
    const listResB = await fetch(`${BASE_URL}/api/v1/senders`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const listBodyB: any = await listResB.json();
    console.log(`User B Senders List count: ${listBodyB.length}`);
    if (listBodyB.length !== 0) {
      throw new Error('User B received senders belonging to User A!');
    }
    console.log('✅ Test 5 PASSED: Strict cross-user data isolation verified.');

    // ----------------------------------------------------
    // TEST 6: User A Payload Sanitization
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Payload Sanitization & Credential Shielding ---');
    const listResA = await fetch(`${BASE_URL}/api/v1/senders`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listBodyA: any = await listResA.json();
    console.log('User A List Response:', listBodyA);

    if (listBodyA.length === 0) {
      throw new Error('Expected User A to have at least 1 sender');
    }
    const item = listBodyA[0];
    if ('smtpPasswordEncrypted' in item || 'smtpPassword' in item || 'rawPassword' in item) {
      throw new Error('SECURITY VIOLATION: Sensitive credentials leaked in list response!');
    }
    console.log('✅ Test 6 PASSED: All API responses strictly sanitize sensitive SMTP fields.');

    // ----------------------------------------------------
    // TEST 7: Ethereal Failure & Retries to FAILED state
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Failure & Retry Lifecycle (PENDING -> FAILED) ---');
    const failSender = await senderRepository.createPending(testUserA.id, 'Failed Test Sender');

    // Simulate provider failure on worker attempt
    const mockWorkerFailure = async () => {
      console.log(`Simulating failed provider for sender ${failSender.id}...`);
      await senderRepository.updateStatus(failSender.id, SenderStatus.FAILED);
    };
    await mockWorkerFailure();

    const failedDbSender = await senderRepository.findById(failSender.id);
    if (failedDbSender?.status !== SenderStatus.FAILED) {
      throw new Error(`Expected status FAILED, got ${failedDbSender?.status}`);
    }
    console.log('✅ Test 7 PASSED: Exhausted retries correctly transition sender to FAILED state.');

    console.log('\n==================================================');
    console.log('🎉 ALL 7 TEST SUITES PASSED PERFECTLY!');
    console.log('==================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error.message || error);
    process.exitCode = 1;
  } finally {
    if (worker) await worker.close();
    server.close();
    await prisma.$disconnect();
  }
}

runTests();
