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
        <p className="hero__subtitle">Otevřený zdroj informací Právnické fakulty Univerzity Karlovy.</p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/intro">
            Na wiki →
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Home"
      description="Open source wiki pro (budoucí) právníky a právničky.">
      <HomepageHeader />
      <main>
        <section className="container margin-vert--xl">
          <div className="row">
            <div className="col col--8 col--offset-2 text--center">
              <h2>O projektu</h2>
              <p>
                Naše wiki je prostor pro efektivní sdílení informací mezi studujícími. 

                Cílem je poskytovat přístupné a přesné informace jak o studiu obecně, tak o obsahu jednotlivých předmětů na Právnické fakultě Univerzity Karlovy. 
              </p>
              <hr />
              <p className="margin-top--md">
                <i>In wiki veritas.</i>
              </p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}