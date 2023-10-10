

const nFrets = 22;
const notes = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const activeNotes = [];

const container = document.querySelector('#container');

const nutPositions = calculateNuts(nFrets);

const arm = createArm(nutPositions);

const fretsByNote = new Map();

// Note commands: toggle, activate, deactivate
const COMMAND_TOGGLE = 'toggle';
const COMMAND_ACTIVATE = 'activate';
const COMMAND_DEACTIVATE = 'deactivate';

window.addEventListener('load', (evt) => {
    document.querySelector('#clear').addEventListener('click', (evt) => {
        clearNotes();
    });
});

class NoteEvent extends Event {
    static TYPE = 'note';
    constructor(note, command) {
        super(NoteEvent.TYPE);
        this.note = note;
        this.command = command;
    }
}

window.addEventListener(NoteEvent.TYPE, noteEventListener);

window.addEventListener('popstate', (evt) => {
    if (evt.state !== null) {
        const notes = evt.state;
        activeNotes.filter(note => !notes.includes(note)).forEach(note => {
            window.dispatchEvent(new NoteEvent(note, COMMAND_DEACTIVATE));
        });
    }
});

window.addEventListener('hashchange', (evt) => {
    if (history.state === null) {
        loadHash();
    } else {
        history.state.filter(note => !activeNotes.includes(note)).forEach(note => {
            window.dispatchEvent(new NoteEvent(note, COMMAND_ACTIVATE));
        });
        activeNotes.filter(note => !history.state.includes(note)).forEach(note => {
            window.dispatchEvent(new NoteEvent(note, COMMAND_DEACTIVATE));
        });
    }
});

arm.strings.forEach((string) => {
    string.frets.forEach((fret) => {

        const byNote = fretsByNote.get(fret.note) ?? [];
        byNote.push(fret.node);
        fretsByNote.set(fret.note, byNote);

        fret.marker.addEventListener('click', (evt) => {
            window.dispatchEvent(new NoteEvent(evt.target.dataset.note, COMMAND_TOGGLE));
        });

        fret.fretString.node.addEventListener('click', (evt) => { return false; });
    });
});

arm.lanes.forEach((lane) => {
    const byNote = fretsByNote.get(lane.stringNote.dataset.note) ?? [];
    byNote.push(lane.stringNote);
    fretsByNote.set(lane.stringNote.dataset.note, byNote);

    lane.stringNote.addEventListener('click', (evt) => {
        window.dispatchEvent(new NoteEvent(evt.target.dataset.note, COMMAND_TOGGLE));
    });
});

loadHash();

function noteToHue(note) {
    // distribute hue between 0 and 360 from notes E2 to D6
    const e2 = noteOrder.indexOf('E') + 2 * 12;
    const d6 = noteOrder.indexOf('D') + 6 * 12;
    const octave = parseInt(note[note.length - 1]);
    const notePos = noteOrder.indexOf(note.substring(0, note.length - 1));
    return ((notePos + octave * 12) - e2) * 360 / (d6 - e2 + 1);
}

function toggleNote(note) {
    const hue = noteToHue(note);
    const nextColor = `hsl(${hue}, 100%, 75%)`;
    
    fretsByNote.get(note).forEach(e => {
        e.classList.toggle('active');
        // set a random background color;
        if (e.classList.contains('active')) {
            if (e.classList.contains('marker')) e.style.color = '#ffff00ff';
            e.style.backgroundColor = nextColor;
        } else {
            if (e.classList.contains('marker')) e.style.color = 'transparent';
            e.style.backgroundColor = 'transparent';
        }
    });
}

function createArm(nutPositions) {
    const arm = document.createElement('div');
    arm.className = 'arm';
    container.appendChild(arm);

    const strings = [];
    const lanes = [];

    for (let i = 0; i < notes.length; i++) {

        const pureNote = notes[i].substring(0, notes[i].length - 1);
        const noteScale = parseInt(notes[i].substring(notes[i].length - 1));

        const lane = createLane(pureNote, noteScale);

        lanes.push(lane);

        strings.push({ frets: createFrets(i, pureNote, noteScale, lane.node, nutPositions) });

        arm.appendChild(lane.node);
    }

    return { node: arm, strings: strings, lanes: lanes };
}

function createLane(pureNote, noteScale) {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.dataset.pureNote = pureNote;
    lane.dataset.noteScale = noteScale;
    lane.dataset.note = pureNote + noteScale;

    const stringNote = document.createElement('div');
    stringNote.classList.add('string-note');
    stringNote.classList.add('note');
    stringNote.dataset.note = pureNote + noteScale;
    stringNote.innerHTML = pureNote + noteScale;
    lane.appendChild(stringNote);

    return { node: lane, stringNote: stringNote };
}

function createString(i, fret) {
    const gstring = document.createElement('div');
    gstring.className = 'string';
    gstring.dataset.string = i;
    gstring.dataset.note = fret.dataset.note;
    gstring.style.setProperty('--string-number', i);

    fret.appendChild(gstring);

    return { node: gstring };
}



function createFrets(i, pureNote, noteScale, lane, nutPositions) {
    const frets = [];
    for (let j = 1; j <= nFrets; j++) {

        const fret = document.createElement('div');
        fret.classList.add('fret');
        fret.classList.add('note');
        fret.dataset.string = i;
        fret.dataset.fret = j;
        fret.dataset.pureNote = pureNote;
        fret.dataset.noteScale = noteScale;

        const notePos = (noteOrder.indexOf(pureNote) + j);
        fret.dataset.note = noteOrder[notePos % 12] + ~~(noteScale + notePos / 12);
        fret.dataset.number = j;
        fret.style.setProperty('--string-number', i);
        fret.style.setProperty('--fret-number', j);
        fret.style.setProperty('--fret-width', nutPositions[j] - nutPositions[j - 1]);

        const fretString = createString(i, fret);

        const marker = document.createElement('div');
        marker.className = 'marker';
        // marker.innerHTML = fret.dataset.note;
        marker.dataset.note = fret.dataset.note;
        fret.appendChild(marker);

        lane.appendChild(fret);
        frets.push({ node: fret, note: fret.dataset.note, fretString: fretString, marker: marker });
    }

    return frets;
}

function calculateNuts(nFrets) {
    const nutToFret = [0];
    for (let i = 1; i <= nFrets; i++) {
        nutToFret.push(nutToFret[i - 1] + (100 - nutToFret[i - 1]) / 17.817);
    }
    const mult = 100 / nutToFret[nutToFret.length - 1];
    nutToFret.forEach((e, i) => {
        nutToFret[i] *= mult;
    });
    return nutToFret;
}

function loadHash() {
    const hash = window.location.hash;
    console.log(activeNotes);
    activeNotes.forEach(toggleNote);
    activeNotes.splice(0, activeNotes.length);
    if (hash) {
        const notes = hash.substring(1).split(',');
        notes.forEach(toggleNote);
        activeNotes.push(...notes);
        activeNotes.sort(noteComparator);
    }
}

function clearNotes() {
    console.log('clear');
    activeNotes.forEach(toggleNote);
    activeNotes.splice(0, activeNotes.length);
    window.location.hash = '';
}

function noteEventListener(evt) {
    const note = evt.note;
    console.log(evt);
    switch (evt.command) {
        case COMMAND_TOGGLE:
            if (activeNotes.includes(note)) {
                activeNotes.splice(activeNotes.indexOf(note), 1);
            } else {
                activeNotes.push(note);
            }
            toggleNote(note);
            break;
        case COMMAND_ACTIVATE:
            if (!activeNotes.includes(note)) {
                activeNotes.push(note);
                toggleNote(note);
            }
            break;
        case COMMAND_DEACTIVATE:
            if (activeNotes.includes(note)) {
                activeNotes.splice(activeNotes.indexOf(note), 1);
                toggleNote(note);
            }
            break;
    }

    activeNotes.sort(noteComparator);

    const state = activeNotes;
    if (history.state == null || history.state.join(",") !== state.join(",")) {
        history.pushState(state, '', '#' + activeNotes.join(','));
    }
}

function noteComparator(a, b) {
    
    const aPos = noteOrder.indexOf(a.substring(0, a.length - 1)) + parseInt(a[a.length - 1]) * 12;
    const bPos = noteOrder.indexOf(b.substring(0, b.length - 1)) + parseInt(b[b.length - 1]) * 12;
    return aPos - bPos;

}

