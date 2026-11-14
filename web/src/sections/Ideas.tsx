import { ideas } from '../content';
import { Section } from '../components/Section';
import { EntryList } from './EntryList';

export function Ideas() {
  return (
    <Section id="ideas" kicker={ideas.kicker} title={ideas.title} intro={ideas.intro}>
      <EntryList entries={ideas.entries} />
    </Section>
  );
}
