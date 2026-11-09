import { describe, expect, it } from 'vitest';
import { MUSIC_GUIDE_LINES } from '../../src/content/world/music-guide-v001';
import { createMusicGuideVisit } from '../../src/world/music-guide-visit';

const arrival = { entered: true, nearby: false, atBirthplace: false, upstairs: true, onUpperFloor: true };

describe('music hall introduction', () => {
  it('waits until the player can respond to the invitation at the birthplace', () => {
    const visit = createMusicGuideVisit(() => {});
    const nearby = { ...arrival, nearby: true, upstairs: false, onUpperFloor: false };
    visit.update(0, nearby);
    visit.finishLine('welcome');
    visit.update(0, nearby);
    expect(visit.inspect()).toMatchObject({ line: null, invitation: false });

    visit.update(0, { ...nearby, atBirthplace: true });
    expect(visit.inspect()).toMatchObject({ line: 'intro', invitation: false });
    visit.finishLine('intro');
    expect(visit.inspect()).toMatchObject({ line: null, invitation: true });
  });

  it('shows the upstairs text once when visiting without the guide', () => {
    const visit = createMusicGuideVisit(() => {});
    visit.update(0, arrival);
    visit.finishLine('welcome');
    visit.update(0, arrival);
    expect(visit.inspect()).toMatchObject({ following: false, line: 'upstairs', subtitleOnly: true });
    expect(visit.speechLine).toBeNull();

    visit.update(0, { ...arrival, upstairs: false, onUpperFloor: false });
    visit.update(0, arrival);
    expect(visit.inspect().line).toBeNull();
  });

  it('keeps the spoken introduction when the guide joins the player', () => {
    const visit = createMusicGuideVisit(() => {});
    const courtyard = { ...arrival, nearby: true, atBirthplace: true, upstairs: false, onUpperFloor: false };
    visit.update(0, courtyard);
    visit.finishLine('welcome');
    visit.update(0, courtyard);
    visit.finishLine('intro');
    visit.respond('plain');
    visit.update(0, arrival);
    expect(visit.inspect()).toMatchObject({ following: true, line: 'upstairs', subtitleOnly: false });
    expect(visit.speechLine).toBe('upstairs');
  });

  it('waits for the visible caption and the welcome audio before starting a first approach', () => {
    const visit = createMusicGuideVisit(() => {}, { firstApproach: true, captionSynchronized: true });
    const gate = { ...arrival, canApproach: true, upstairs: false, onUpperFloor: false };
    const faceToFace = { ...gate, nearby: true, atBirthplace: true };
    visit.update(0, gate);
    visit.update(MUSIC_GUIDE_LINES.welcome.seconds + 1, gate);
    expect(visit.inspect()).toMatchObject({ line: 'welcome', approaching: false });

    visit.setCaptionPresented('welcome', true);
    visit.setVoicePlaying('welcome', true);
    visit.update(MUSIC_GUIDE_LINES.welcome.seconds + 1, gate);
    expect(visit.inspect()).toMatchObject({ line: 'welcome', approaching: false });
    visit.finishLine('welcome');
    visit.update(1, faceToFace);
    visit.interact();
    expect(visit.inspect()).toMatchObject({ line: null, approaching: true, invitation: false });

    visit.finishApproach(true);
    visit.update(0, faceToFace);
    expect(visit.inspect()).toMatchObject({ line: 'intro', approaching: false, invitation: false });
    visit.reset();
    visit.update(0, gate);
    visit.finishLine('welcome');
    expect(visit.inspect().approaching).toBe(false);
  });

  it('uses the caption reading time when audio is unavailable and allows a later retry after canceling', () => {
    const visit = createMusicGuideVisit(() => {}, { firstApproach: true, captionSynchronized: true });
    const gate = { ...arrival, canApproach: true, upstairs: false, onUpperFloor: false };
    visit.update(0, gate);
    visit.setCaptionPresented('welcome', true);
    visit.update(MUSIC_GUIDE_LINES.welcome.seconds, gate);
    expect(visit.inspect().approaching).toBe(true);
    visit.finishApproach(false);
    expect(visit.waitingForApproach).toBe(false);
    visit.reset();
    visit.update(0, gate);
    visit.finishLine('welcome');
    expect(visit.inspect().approaching).toBe(true);
  });
});
