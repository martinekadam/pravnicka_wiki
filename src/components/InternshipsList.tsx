import React, { useState, useMemo } from 'react';
import internshipsData from '../data/internships.json';

interface Internship {
  id: string;
  name: string;
  description: string;
  extendedDescription: string;
  videoUrl: string;
  legalProfession: string[];
  semester: string;
  guarantor: string;
  credits: number;
  hours: number;
  recommendedYear: string;
}

export default function InternshipsList() {
  const [selectedProfessions, setSelectedProfessions] = useState<Set<string>>(new Set());
  const [selectedSemesters, setSelectedSemesters] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const internships: Internship[] = internshipsData.internships;

  // Get unique professions
  const allProfessions = useMemo(() => {
    const profs = new Set<string>();
    internships.forEach(i => i.legalProfession.forEach(p => profs.add(p)));
    return Array.from(profs).sort();
  }, []);

  const allSemesters = ['letní', 'zimní', 'oba'];

  // Toggle functions
  const toggleProfession = (prof: string) => {
    const newSet = new Set(selectedProfessions);
    if (newSet.has(prof)) {
      newSet.delete(prof);
    } else {
      newSet.add(prof);
    }
    setSelectedProfessions(newSet);
  };

  const toggleSemester = (sem: string) => {
    const newSet = new Set(selectedSemesters);
    if (newSet.has(sem)) {
      newSet.delete(sem);
    } else {
      newSet.add(sem);
    }
    setSelectedSemesters(newSet);
  };

  const clearFilters = () => {
    setSelectedProfessions(new Set());
    setSelectedSemesters(new Set());
  };

  // Filter internships
  const filteredInternships = useMemo(() => {
    return internships.filter(internship => {
      // Profession filter
      if (selectedProfessions.size > 0) {
        const hasMatch = internship.legalProfession.some(p => selectedProfessions.has(p));
        if (!hasMatch) return false;
      }

      // Semester filter
      if (selectedSemesters.size > 0) {
        const matches = selectedSemesters.has(internship.semester) || 
                       (internship.semester === 'oba' && selectedSemesters.size > 0);
        if (!matches) return false;
      }

      return true;
    });
  }, [selectedProfessions, selectedSemesters, internships]);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Convert YouTube URL to embeddable format
  const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return '';

    // Already in embed format
    if (url.includes('/embed/')) {
      return url;
    }

    // Extract video ID from various YouTube URL formats
    let videoId = '';

    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      videoId = urlParams.get('v') || '';
    }
    // Format: https://youtu.be/VIDEO_ID
    else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    // Format: https://www.youtube.com/v/VIDEO_ID
    else if (url.includes('youtube.com/v/')) {
      videoId = url.split('youtube.com/v/')[1].split('?')[0];
    }

    // Return embed URL if we found a video ID
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  // Parse and render formatted text with paragraphs and bullet points
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const paragraphs = text.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, pIdx) => {
      const lines = paragraph.split('\n').map(l => l.trim()).filter(l => l);

      // Check if this paragraph is a bullet list (multiple lines starting with - or *)
      const isBulletList = lines.length > 1 && lines.every(line =>
        line.startsWith('- ') || line.startsWith('* ')
      );

      if (isBulletList) {
        return (
          <ul key={pIdx} style={{ marginBottom: '1rem' }}>
            {lines.map((line, lIdx) => (
              <li key={lIdx}>{line.replace(/^[-*]\s+/, '')}</li>
            ))}
          </ul>
        );
      }

      // Regular paragraph
      return <p key={pIdx} style={{ marginBottom: '1rem' }}>{paragraph}</p>;
    });
  };

  return (
    <div>
      {/* Filters Section */}
      <div className="card margin-bottom--lg">
        <div className="card__header">
          <h3>Filtrovat praxe</h3>
        </div>
        <div className="card__body">
          <div className="margin-bottom--md">
            <h4 className="margin-bottom--sm">Právnické povolání</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {allProfessions.map(prof => (
                <button
                  key={prof}
                  onClick={() => toggleProfession(prof)}
                  className={`button button--sm ${selectedProfessions.has(prof) ? 'button--primary' : 'button--secondary'}`}
                  style={{ marginBottom: '0.5rem' }}
                >
                  {prof}
                </button>
              ))}
            </div>
          </div>

          <div className="margin-bottom--md">
            <h4 className="margin-bottom--sm">Semestr</h4>
            <div className="button-group">
              {allSemesters.map(sem => (
                <button
                  key={sem}
                  onClick={() => toggleSemester(sem)}
                  className={`button button--sm ${selectedSemesters.has(sem) ? 'button--primary' : 'button--secondary'}`}
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>

          {(selectedProfessions.size > 0 || selectedSemesters.size > 0) && (
            <button
              onClick={clearFilters}
              className="button button--sm button--link"
            >
              ✕ Resetovat filtry
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="margin-bottom--md">
        <strong>
          Nalezeno: {filteredInternships.length} {
            filteredInternships.length === 1 ? 'praxe' :
            filteredInternships.length < 5 ? 'praxe' : 'praxí'
          }
        </strong>
      </div>

      {/* Internships list */}
      {filteredInternships.length === 0 ? (
        <div className="admonition admonition-info">
          <p>Žádné praxe nenalezeny. Zkuste upravit filtry.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {filteredInternships.map((internship) => (
            <div key={internship.id} className="card">
              <div className="card__header">
                <h3 className="margin-bottom--sm">{internship.name}</h3>
                <p className="text--text margin-bottom--none" style={{ fontSize: '0.9rem' }}>
                  {internship.description}
                </p>
              </div>

              <div className="card__body">
                {/* Tags and metadata */}
                <div className="margin-bottom--md" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {internship.legalProfession.map((prof, idx) => (
                    <span key={idx} className="badge badge--primary">
                      {prof}
                    </span>
                  ))}
                </div>

                {/* Info row */}
                <div
                  className="text--text margin-bottom--md"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <span>📅 {internship.semester}</span>
                  <span>🎓 {internship.credits} kreditů</span>
                  <span>⏱️ {internship.hours}h</span>
                  <span>👤 {internship.guarantor}</span>
                  <span>📚 {internship.recommendedYear}</span>
                </div>

                <button
                  onClick={() => toggleExpanded(internship.id)}
                  className="button button--sm button--secondary"
                >
                  {expandedId === internship.id ? '▲ Skrýt detail' : '▼ Zobrazit detail'}
                </button>

                {expandedId === internship.id && (
                  <div
                    className="margin-top--md"
                    style={{
                      borderTop: '1px solid var(--ifm-hr-background-color)',
                      paddingTop: '1rem'
                    }}
                  >
                    {internship.videoUrl && (
                      <div className="margin-bottom--md" style={{ maxWidth: '600px' }}>
                        <div
                          style={{
                            position: 'relative',
                            paddingBottom: '56.25%',
                            height: 0,
                            overflow: 'hidden',
                            borderRadius: 'var(--ifm-global-radius)'
                          }}
                        >
                          <iframe
                            src={getYouTubeEmbedUrl(internship.videoUrl)}
                            title={`Video: ${internship.name}`}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              border: 0
                            }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}

                    {internship.extendedDescription ? (
                      <div className="margin-bottom--md">
                        <h4>Podrobný popis</h4>
                        <div>{renderFormattedText(internship.extendedDescription)}</div>
                      </div>
                    ) : (
                      <p className="margin-bottom--md">
                        <em>Rozšířený popis bude doplněn.</em>
                      </p>
                    )}

                    <a
                      href={`https://is.cuni.cz/studium/predmety/index.php?do=predmet&kod=${internship.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button--primary button--sm"
                    >
                      Zobrazit v SIS →
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
