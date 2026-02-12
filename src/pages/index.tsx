import React, { JSX } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">Právnická wiki</h1>
        <p className="hero__subtitle">Otevřený zdroj studijních materiálů z Právnické fakulty Univerzity Karlovy.</p>
        <p className={styles.heroDescription}>
          Zkouškové otázky, testy a interaktivní nástroje na jednom místě.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/intro">
            Prozkoumat wiki
          </Link>
          <Link
            className={clsx('button button--secondary button--lg', styles.buttonSecondary)}
            to="/docs/studijni-opory/planovac-studia">
            Plánovač studia
          </Link>
        </div>
      </div>
    </header>
  );
}


function HomepageQuickLinks(): JSX.Element {
  return (
    <section className={clsx('container margin-vert--lg', styles.quickLinks)}>
      <div className="row">
        <div className="col col--8 col--offset-2">
          <h2 className="text--center margin-bottom--lg">Rychlé odkazy</h2>
          <div className={styles.linkGrid}>
            <Link to="/docs/povinne-predmety/rimske-pravo" className={styles.quickLinkCard}>
              <h3>⚖️ Povinné předměty</h3>
              <p>Materiály k povinným předmětům</p>
            </Link>
            <Link to="/docs/povinne-volitelne-predmety/kriminologie-i" className={styles.quickLinkCard}>
              <h3>📖 Povinně volitelné</h3>
              <p>Materiály k pévépéčkům</p>
            </Link>
            <Link to="/docs/studijni-opory/pravni-praxe" className={styles.quickLinkCard}>
              <h3>💼 Právní praxe</h3>
              <p>Přehled právních praxí nabízených fakultou</p>
            </Link>
            <Link to="/docs/studijni-opory/planovac-studia" className={styles.quickLinkCard}>
              <h3>📅 Plánovač studia</h3>
              <p>Naplánujte si studium</p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Home"
      description="Open source wiki pro (budoucí) právníky a právničky.">
      <HomepageHeader />
      <main>
        <HomepageQuickLinks />
      </main>
    </Layout>
  );
}