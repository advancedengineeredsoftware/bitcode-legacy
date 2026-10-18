/**
 * @jest-environment node
 *
 * Product /api/read-review — Read-Evaluation synthesis and review actions only.
 * Protocol-demo host surfaces (scenario GET / specifying reviewRead) are removed.
 */

import { POST } from '@/app/api/read-review/route';

describe('/api/read-review', () => {
  it('rejects unknown legacy protocol-demo review actions', async () => {
    const response = await POST(
      new Request('http://localhost/api/read-review', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'scenario-auth',
          readReviewAction: 'accept',
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Unsupported read-review action/i);
  });

  it('synthesizes a reviewable Read-Evaluation before Finding Fits', async () => {
    const response = await POST(
      new Request('http://localhost/api/read-review', {
        method: 'POST',
        body: JSON.stringify({
          action: 'synthesize_read_evaluation',
          readId: 'read-activity',
          readPrompt: 'Find a source-bound product AssetPack fit.',
          sourceRevision: {
            repositoryFullName: 'octocat/Spoon-Knife',
            branch: 'main',
            commit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
          },
          targetArtifactKinds: ['asset-pack-evidence', 'proof-root'],
          closureCriteria: ['Candidate must be source-bound.'],
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.pipelineName).toBe('ReadEvaluationComprehensionSynthesis');
    expect(payload.stage).toBe('review_synthesized_evaluation');
    expect(payload.action).toBe('synthesize_read_evaluation');
    expect(payload.readEvaluation?.schema).toBe('bitcode.read.need');
    expect(payload.telemetry?.schema).toBe('bitcode.read-evaluation.synthesis-telemetry');
  });

  it('resynthesizes a Read-Evaluation from operator feedback', async () => {
    const first = await POST(
      new Request('http://localhost/api/read-review', {
        method: 'POST',
        body: JSON.stringify({
          action: 'synthesize_read_evaluation',
          readId: 'read-activity',
          readPrompt: 'Find a source-bound product AssetPack fit.',
          sourceRevision: {
            repositoryFullName: 'octocat/Spoon-Knife',
            branch: 'main',
            commit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
          },
        }),
      }),
    );
    const firstPayload = await first.json();
    expect(first.status).toBe(200);

    const response = await POST(
      new Request('http://localhost/api/read-review', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resynthesize_read_evaluation',
          previousReadEvaluation: firstPayload.readEvaluation,
          feedback: ['Tighten source-bound constraints.'],
          readPrompt: 'Find a source-bound product AssetPack fit.',
          sourceRevision: {
            repositoryFullName: 'octocat/Spoon-Knife',
            branch: 'main',
            commit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
          },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.action).toBe('resynthesize_read_evaluation');
    expect(payload.stage).toBe('review_synthesized_evaluation');
  });

  it('accepts a synthesized Read-Evaluation for Finding Fits admission', async () => {
    const synthesized = await POST(
      new Request('http://localhost/api/read-review', {
        method: 'POST',
        body: JSON.stringify({
          action: 'synthesize_read_evaluation',
          readId: 'read-activity',
          readPrompt: 'Find a source-bound product AssetPack fit.',
          sourceRevision: {
            repositoryFullName: 'octocat/Spoon-Knife',
            branch: 'main',
            commit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
          },
        }),
      }),
    );
    const synthesizedPayload = await synthesized.json();
    expect(synthesized.status).toBe(200);

    const response = await POST(
      new Request('http://localhost/api/read-review', {
        method: 'POST',
        body: JSON.stringify({
          action: 'accept_read_evaluation',
          readEvaluation: synthesizedPayload.readEvaluation,
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.action).toBe('accept_read_evaluation');
    expect(payload.stage).toBe('request_fit_ready');
    expect(payload.acceptedReadEvaluation).toBeTruthy();
  });

  it('rejects a synthesized Read-Evaluation without admitting Finding Fits', async () => {
    const synthesized = await POST(
      new Request('http://localhost/api/read-review', {
        method: 'POST',
        body: JSON.stringify({
          action: 'synthesize_read_evaluation',
          readId: 'read-activity',
          readPrompt: 'Find a source-bound product AssetPack fit.',
          sourceRevision: {
            repositoryFullName: 'octocat/Spoon-Knife',
            branch: 'main',
            commit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
          },
        }),
      }),
    );
    const synthesizedPayload = await synthesized.json();
    expect(synthesized.status).toBe(200);

    const response = await POST(
      new Request('http://localhost/api/read-review', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reject_read_evaluation',
          readEvaluation: synthesizedPayload.readEvaluation,
          feedback: ['Evaluation is too broad.'],
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.action).toBe('reject_read_evaluation');
    expect(payload.rejectedReadEvaluation).toBeTruthy();
  });
});
