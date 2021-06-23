"use strict";
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const MRE = __importStar(require("@microsoft/mixed-reality-extension-sdk"));
// Load the database of hats.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HatDatabase = require('../public/hats.json');
/**
 * WearAHat Application - Showcasing avatar attachments.
 */
class WearAHat {
    /**
     * Constructs a new instance of this class.
     * @param context The MRE SDK context.
     * @param baseUrl The baseUrl to this project's `./public` folder.
     */
    constructor(context) {
        this.context = context;
        this.prefabs = {};
        // Container for instantiated hats.
        this.attachedHats = new Map();
        // use () => {} syntax here to get proper scope binding when called via setTimeout()
        // if async is required, next line becomes private startedImpl = async () => {
        this.startedImpl = async () => {
            // Preload all the hat models.
            await this.preloadHats();
            // Show the hat menu.
            this.showHatMenu();
        };
        this.assets = new MRE.AssetContainer(context);
        // Hook the context events we're interested in.
        this.context.onStarted(() => this.started());
        this.context.onUserLeft(user => this.userLeft(user));
    }
    /**
     * Called when a Hats application session starts up.
     */
    async started() {
        // Check whether code is running in a debuggable watched filesystem
        // environment and if so delay starting the app by 1 second to give
        // the debugger time to detect that the server has restarted and reconnect.
        // The delay value below is in milliseconds so 1000 is a one second delay.
        // You may need to increase the delay or be able to decrease it depending
        // on the speed of your PC.
        const delay = 1000;
        const argv = process.execArgv.join();
        const isDebug = argv.includes('inspect') || argv.includes('debug');
        // // version to use with non-async code
        // if (isDebug) {
        // 	setTimeout(this.startedImpl, delay);
        // } else {
        // 	this.startedImpl();
        // }
        // version to use with async code
        if (isDebug) {
            await new Promise(resolve => setTimeout(resolve, delay));
            await this.startedImpl();
        }
        else {
            await this.startedImpl();
        }
    }
    /**
     * Called when a user leaves the application (probably left the Altspace world where this app is running).
     * @param user The user that left the building.
     */
    userLeft(user) {
        // If the user was wearing a hat, destroy it. Otherwise it would be
        // orphaned in the world.
        this.removeHats(user);
    }
    /**
     * Show a menu of hat selections.
     */
    showHatMenu() {
        // Create a parent object for all the menu items.
        const menu = MRE.Actor.Create(this.context, {});
        let y = 0.3;
        // Create menu button
        const buttonMesh = this.assets.createBoxMesh('button', 0.3, 0.3, 0.01);
        // Loop over the hat database, creating a menu item for each entry.
        for (const hatId of Object.keys(HatDatabase)) {
            // Create a clickable button.
            const button = MRE.Actor.Create(this.context, {
                actor: {
                    parentId: menu.id,
                    name: hatId,
                    appearance: { meshId: buttonMesh.id },
                    collider: { geometry: { shape: MRE.ColliderType.Auto } },
                    transform: {
                        local: { position: { x: 0, y, z: 0 } }
                    }
                }
            });
            // Set a click handler on the button.
            button.setBehavior(MRE.ButtonBehavior)
                .onClick(user => this.wearHat(hatId, user.id));
            // Create a label for the menu entry.
            MRE.Actor.Create(this.context, {
                actor: {
                    parentId: menu.id,
                    name: 'label',
                    text: {
                        contents: HatDatabase[hatId].displayName,
                        height: 0.5,
                        anchor: MRE.TextAnchorLocation.MiddleLeft
                    },
                    transform: {
                        local: { position: { x: 0.5, y, z: 0 } }
                    }
                }
            });
            y = y + 0.5;
        }
        // Create a label for the menu title.
        MRE.Actor.Create(this.context, {
            actor: {
                parentId: menu.id,
                name: 'label',
                text: {
                    contents: ''.padStart(8, ' ') + "Skin UNAM",
                    height: 0.8,
                    anchor: MRE.TextAnchorLocation.MiddleCenter,
                    color: MRE.Color3.Red()
                },
                transform: {
                    local: { position: { x: 0.5, y: y + 0.25, z: 0 } }
                }
            }
        });
    }
    /**
     * Preload all hat resources. This makes instantiating them faster and more efficient.
     */
    preloadHats() {
        // Loop over the hat database, preloading each hat resource.
        // Return a promise of all the in-progress load promises. This
        // allows the caller to wait until all hats are done preloading
        // before continuing.
        return Promise.all(Object.keys(HatDatabase).map(hatId => {
            const hatRecord = HatDatabase[hatId];
            if (hatRecord.resourceName) {
                return this.assets.loadGltf(hatRecord.resourceName)
                    .then(assets => {
                    this.prefabs[hatId] = assets.find(a => a.prefab !== null);
                })
                    .catch(e => MRE.log.error("app", e));
            }
            else {
                return Promise.resolve();
            }
        }));
    }
    /**
     * Instantiate a hat and attach it to the avatar's head.
     * @param hatId The id of the hat in the hat database.
     * @param userId The id of the user we will attach the hat to.
     */
    wearHat(hatId, userId) {
        // If the user is wearing a hat, destroy it.
        this.removeHats(this.context.user(userId));
        const hatRecord = HatDatabase[hatId];
        // If the user selected 'none', then early out.
        if (!hatRecord.resourceName) {
            return;
        }
        // Create the hat model and attach it to the avatar's head.
        this.attachedHats.set(userId, MRE.Actor.CreateFromPrefab(this.context, {
            prefab: this.prefabs[hatId],
            actor: {
                transform: {
                    local: {
                        position: hatRecord.position,
                        rotation: MRE.Quaternion.FromEulerAngles(hatRecord.rotation.x * MRE.DegreesToRadians, hatRecord.rotation.y * MRE.DegreesToRadians, hatRecord.rotation.z * MRE.DegreesToRadians),
                        scale: hatRecord.scale,
                    }
                },
                attachment: {
                    attachPoint: 'hips',
                    userId
                }
            }
        }));
    }
    removeHats(user) {
        if (this.attachedHats.has(user.id)) {
            this.attachedHats.get(user.id).destroy();
        }
        this.attachedHats.delete(user.id);
    }
}
exports.default = WearAHat;
//# sourceMappingURL=app.js.map