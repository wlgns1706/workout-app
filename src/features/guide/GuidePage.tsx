import { Link } from 'react-router-dom';
import { GUIDE } from './guideContent';

export default function GuidePage() {
  return (
    <main className="page">
      <div className="row between">
        <h1>사용법</h1>
        <Link className="btn small" to="/settings">닫기</Link>
      </div>
      {GUIDE.map((section, i) => (
        <details key={section.title} className="card" open={i === 0}>
          <summary><strong>{section.title}</strong></summary>
          <ol style={{ paddingLeft: 20, margin: '8px 0 0' }}>
            {section.items.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
          </ol>
        </details>
      ))}
    </main>
  );
}
