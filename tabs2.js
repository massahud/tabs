

const nFrets = 24;
const notes = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const activeNotes = [];

const container = document.querySelector('#container');

const nutPositions = calculateNuts(nFrets+1);

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

        fret.node.addEventListener('click', (evt) => {
            if (evt.target.dataset.note !== undefined) {
                window.dispatchEvent(new NoteEvent(evt.target.dataset.note, COMMAND_TOGGLE));
            }
        });

        // fret.fretString.node.addEventListener('click', (evt) => { return false; });
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
            e.style.backgroundColor = nextColor;
        } else {
            e.style.backgroundColor = 'transparent';
        }
    });
}

function createArm(nutPositions) {
    const arm = document.createElement('div');
    arm.className = 'arm';
    // set the number of frets in the grid
    arm.style.gridTemplateColumns = `repeat(${nFrets+1}, 1fr)`;
    container.appendChild(arm);

    const strings = [];
    const lanes = [];

    for (let i = 0; i < notes.length; i++) {

        const pureNote = notes[i].substring(0, notes[i].length - 1);
        const noteScale = parseInt(notes[i].substring(notes[i].length - 1));

        
        strings.push({ frets: createFrets(i, pureNote, noteScale, arm, nutPositions) });
    }

    return { node: arm, strings: strings, lanes: lanes };
}

function createFrets(i, pureNote, noteScale, arm, nutPositions) {
    const frets = [];
    for (let j = 0; j <= nFrets; j++) {

        const fret = document.createElement('button');
        
        fret.classList.add('fret');
        fret.classList.add('note');
        fret.dataset.string = i;
        fret.dataset.fret = j;
        fret.dataset.pureNote = pureNote;
        fret.dataset.noteScale = noteScale;

        

        const notePos = (noteOrder.indexOf(pureNote) + j);
        // ~~ is a bitwise NOT operator, it's a faster way to floor a POSITIVE number
        fret.dataset.note = noteOrder[notePos % 12] + ~~(noteScale + notePos / 12);
        fret.dataset.number = j;
        fret.style.setProperty('--string-number', i);
        fret.style.setProperty('--fret-number', j);
        fret.style.setProperty('--fret-width', nutPositions[j+1] - nutPositions[j]);
        fret.id = `f${pureNote}${noteScale}-${fret.dataset.note}`;

        const label = document.createElement('label');
        label.innerText = fret.dataset.note;
        label.setAttribute('for', fret.id);

        fret.appendChild(label);
    
        arm.appendChild(fret);
        frets.push({ node: fret, note: fret.dataset.note });
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
    activeNotes.forEach(toggleNote);
    activeNotes.splice(0, activeNotes.length);
    if (hash) {
        const notes = hash.substring(1).split(',');
        console.log(`Loading notes: `, notes);
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

