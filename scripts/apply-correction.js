// Counts qualifying "APPROVE" comments on a correction issue and, once the
// threshold is met, parses the issue body and applies the proposed fix to
// questions.js. Run inside GitHub Actions (needs GITHUB_TOKEN, GITHUB_REPOSITORY,
// ISSUE_NUMBER in the environment). Writes applied/summary to $GITHUB_OUTPUT.
const fs = require('fs');
const path = require('path');

const APPROVAL_THRESHOLD = 2;
const VALID_FIELDS = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'answer', 'reference'];

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY; // "owner/name"
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const [OWNER, NAME] = REPO.split('/');

function setOutput(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<EOF\n${value}\nEOF\n`);
}

async function api(pathname) {
  const r = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!r.ok) throw new Error(`GitHub API ${pathname} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

function parseBody(body) {
  function section(name) {
    const re = new RegExp('### ' + name + '\\s*\\n([\\s\\S]*?)(?=\\n### |$)');
    const m = re.exec(body);
    return m ? m[1].trim() : '';
  }
  const qid = section('Question ID').match(/\d+/);
  const field = section('Field to correct').replace(/<!--.*?-->/gs, '').trim();
  const proposed = section('Proposed new value').replace(/<!--.*?-->/gs, '').trim();
  return {
    id: qid ? qid[0].padStart(5, '0') : null,
    field: field,
    proposed: proposed
  };
}

async function main() {
  const issue = await api(`/repos/${OWNER}/${NAME}/issues/${ISSUE_NUMBER}`);
  const labels = (issue.labels || []).map(l => l.name);

  if (issue.state !== 'open' || !labels.includes('correction') || labels.includes('applied')) {
    setOutput('applied', 'false');
    setOutput('summary', 'Issue not eligible (closed, not a correction, or already applied).');
    return;
  }

  const comments = await api(`/repos/${OWNER}/${NAME}/issues/${ISSUE_NUMBER}/comments?per_page=100`);
  const approvers = new Set();
  for (const c of comments) {
    if (c.body.trim().toUpperCase() !== 'APPROVE') continue;
    if (c.user.login === issue.user.login) continue; // no self-approval
    try {
      const perm = await api(`/repos/${OWNER}/${NAME}/collaborators/${c.user.login}/permission`);
      if (['admin', 'write'].includes(perm.permission)) approvers.add(c.user.login);
    } catch (e) { /* not a collaborator, ignore */ }
  }

  if (approvers.size < APPROVAL_THRESHOLD) {
    setOutput('applied', 'false');
    setOutput('summary', `Only ${approvers.size}/${APPROVAL_THRESHOLD} qualifying approvals so far.`);
    return;
  }

  const parsed = parseBody(issue.body || '');
  if (!parsed.id || !VALID_FIELDS.includes(parsed.field) || !parsed.proposed) {
    setOutput('applied', 'false');
    setOutput('summary', `Approved by ${approvers.size} reviewers, but the issue body could not be parsed (missing Question ID / valid field name / proposed value). Needs a manual edit.`);
    return;
  }

  const qFile = path.join(__dirname, '..', 'questions.js');
  const raw = fs.readFileSync(qFile, 'utf8');
  const m = /var QUESTIONS = (\[[\s\S]*\]);/.exec(raw);
  if (!m) throw new Error('Could not locate QUESTIONS array in questions.js');
  const questions = JSON.parse(m[1]);
  const q = questions.find(x => x.id === parsed.id);
  if (!q) {
    setOutput('applied', 'false');
    setOutput('summary', `Approved by ${approvers.size} reviewers, but Question ID ${parsed.id} was not found in questions.js.`);
    return;
  }

  if (parsed.field === 'question') q.question = parsed.proposed;
  else if (parsed.field.startsWith('option')) q.options[parsed.field.slice(-1)] = parsed.proposed;
  else if (parsed.field === 'answer') q.answer = parsed.proposed.trim().toUpperCase().slice(0, 1);
  else if (parsed.field === 'reference') q.reference = parsed.proposed;

  fs.writeFileSync(qFile, 'var QUESTIONS = ' + JSON.stringify(questions) + ';', 'utf8');

  setOutput('applied', 'true');
  setOutput('summary', `Applied: Question ID ${parsed.id}, field "${parsed.field}" updated. Approved by: ${Array.from(approvers).join(', ')}.`);
}

main().catch(e => {
  console.error(e);
  setOutput('applied', 'false');
  setOutput('summary', 'Script error: ' + e.message);
});
