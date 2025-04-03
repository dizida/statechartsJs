import Konva from "konva";
import { createMachine, createActor } from 'xstate';

// L'endroit où le dessin va être affiché
const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

// Une couche pour le dessin
const dessin = new Konva.Layer();
// Une couche pour la polyline en cours de construction
const temporaire = new Konva.Layer();
stage.add(dessin);
stage.add(temporaire);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiALQBGAJwB2IgBYAHKtUBWHQDYth1afUAaEJiUBmPsaLL1xvuo3qATFuPr1LQBfIJs0LDxCIggAJwBDAHcCKGp6ZloANSZ+ISQQNDFJaVkFBG9vZSIDbx1vPj4de0a+b0MbOwR7NW1VLtUap3c+PxCwjBwCYljE5NTGVg5uHNkCiSkZPNKtAwMiPn7lFsbPdQNA9qVlX20jRsNjZSutYND88cip+KT8FKZ8cTAMWWeVWRQ2oFKym22mUBj4Z3s5Q89kRFwQjRc-i8CK06h0OlGbwik2iX1mTFgAGM4sgwMCRIV1iVEPYfEQdM9asY9OpHup7Fo0Y8qhytPtWQZ3F1+YTwhMotNvikAEJxSkAa1gyDVdMEK1Ea2Km0uxlURG8Blc7laWmUjVMaLFfCIxlubl5BgsjQMIVe+FQEDg+uJhH1jKNEKUvl2un0RlM5ksaMU9l62jch1N9klOlcLzGIeIpHIYcN4PkSnUztUrihpncRn2gtsiF2notymMxia+30+1l7xJiuSpbBzIQlVZwxqgWUAvxxjRFTb5WznoMukCZ19QSAA */
        id: "polyLine",
        initial: "idle",
        states : {
            idle: {
                on: {
                    MOUSECLICK: {
                        target: "drawing",
                        actions: "createLine",
                    },
                },
            }
            ,
            drawing: {
                on: {
                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },

                    MOUSECLICK: [
                        {
                            guard: "pasPlein",
                            actions: "addPoint",
                        },
                    ],

                    Enter: [
                        {
                            guard: "canSave",
                            target: "idle",
                            actions: "saveLine",
                        },
                    ],

                    Escape: {
                        target: "idle",
                        actions: "abandon",
                    },

                    Backspace: {
                        actions: "removeLastPoint",
                        guard: "plusDeDeuxPoints"
                    }
                },
            },
        },
    },
    // Quelques actions et guardes que vous pouvez utiliser dans le statechart
    {
        actions: {
            // Créer une nouvelle polyline
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                temporaire.add(polyline);
            },
            // Mettre à jour le dernier point (provisoire) de la polyline
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                temporaire.batchDraw();
            },
            // Enregistrer la polyline
            saveLine: (context, event) => {
                polyline.remove(); // On l'enlève de la couche temporaire
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                polyline.stroke("black"); // On change la couleur
                // On sauvegarde la polyline dans la couche de dessin
                dessin.add(polyline); // On l'ajoute à la couche de dessin
            },
            // Ajouter un point à la polyline
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
            // Abandonner le tracé de la polyline
            abandon: (context, event) => {
                polyline.remove();
                polyline = null;
                temporaire.batchDraw();
            },
            // Supprimer le dernier point de la polyline
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
        },
        guards: {
            // On peut encore ajouter un point
            pasPlein: (context, event) => {
                // Ignorer le point provisoire (dernier point temporaire)
                return polyline.points().length <= MAX_POINTS * 2;
            },
            // On peut enlever un point
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 4;
            },
            // On peut enregistrer la polyline
            canSave: (context, event) => {
            const pointCount = Math.floor(polyline.points().length / 2);
            return pointCount >= 2 && pointCount <= MAX_POINTS+1;
    },
        },
    }
);
// On démarre la machine d'état
const actor = createActor(polylineMachine);
actor.start();

// On transmet les événements au statechart
stage.on("click", () => {
    actor.send({type: "MOUSECLICK"});
});

stage.on("mousemove", () => {
    actor.send({type: "MOUSEMOVE"});
});

// Envoi des touches clavier à la machine
window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    actor.send({type: event.key});
});
