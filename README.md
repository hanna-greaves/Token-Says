![Latest Release Download Count](https://img.shields.io/github/downloads/napolitanod/Token-Says/latest/module.zip)
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Ftoken-says%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/token-says/)

First released on 7/26/2021!

# Token-Says
Bring some penache into your world. With Token Says, when the tokens DO something they also SAY something... at least sometimes. I mean, they're bold and brave, but they're not cocky.


![image](https://user-images.githubusercontent.com/22696153/126870404-1ed65d98-297f-4f9e-9d59-730b721f4e82.png)
> An Azer token reacts to their heated body invocation (token art by Forgotten Adventures)

# Alpha (WARNING)
This module is in alpha. Use at your own risk for the time being. There may be significant changes to the API or functions or data structure as feature use becomes known. Please keep your rules to a minimum to avoid too much lost work. Though I am designing not to be system specific, so far this is only tested in DND5E.

## Why Use?
Your players or DM may want to add a little spice to their Foundry VTT session. Perhaps they have a halfling archer that says little quips whenever they score a hit with their shortbow. Or perhaps they have a samurai warrior that expresses a teaching with each katana strike. Or perhaps the DM would like a lion's bite action to be coordinated with one of a number of possible roaring sounds on occasion. All of these things are possible with Token Says.

The rule configurations for Token Says that govern who says what and under what circumstances live outside of any actor or item document, making it easy to add new rules, update exisitng ones, and delete or inactivate those rules you no longer want to have occur. Because what is said via chat message may be controlled by rollable tables, players with access to edit their own rollable tables may add, adjust and refine their character's phrases. Or make it simple and link to an existing compendium's rollable table! Don't think that halfling archer would come up with a quip every time? No sweat! Set a likelihood for how often a token will say a particular rule and Token Says will only say something that percent of the time.

## How it Works
The Token Says feature uses a set of Token Says rules that you create for your world in order to auto generate chat messages, chat bubbles and audio sounds when specific tokens or actors do something. The token may say the same thing every time or it can be randomized using a playlist or rollable table. Other features include:
* Use of compendium data so that the rollable tables and playlists do not need to be in your world (though you can also use your world's data too).
* Rules can be specific to a certain action (e.g. token performs an attack roll with a warhammer) or generic (e.g. token performs an ability check).
* Likelihood can be set so that the token doesn't always say something. For example, with a likelihood of 10 set for a token's initiative check, they will only say something on 10% of their initiative rules.


## Token Says Rules

![image](https://user-images.githubusercontent.com/22696153/126869424-81ba223e-7113-4593-bf46-6337d57f3b6d.png)

Token Says rules can be configured within the "Open Rules Settings" area of the game module settings. Toggle that tabs to enter new or access existing rollable table rules or audio playlist rules.
* Add: add a new rule by select + Add in the subheader of that tab
* Edit: update an existing rule by selecting the edit pencil icon for that rule
* Delete: delete a rule by selecting the trash beside that rule's name


## Configuring Rules
Each rule is configured on a specific token or actor, based on name, for a given action and the rule is only hit when that token or actor performs the action. 
* **Rule Name:** Give each rule a name. The name is what displays in the rule configuration list.
* **Token Name:** Name the token for which this rule applies. This is case sensitive and mind the spelling!
* **Use Actor Name:** Checking this will determine if the rule triggers based on the name of the actor associated to the token (as opposed to using the token name). This is useful in situations where your tokens may have different names than the source actor.
* **Action Type:** Select from a list of available options for triggering actions that may invoke a rule. This is system-specific. See action name below for the list of current available action types.
* **Action Name:** Type in the name of the action associated to the action type.
  * Initiative Roll: leave blank
  * Item Name: use the item name that triggers the action (e.g. Action Surge)
  * Ability Check (dnd5e): use the 3 letter value for the ability (e.g. str)
  * Saving Throw (dnd5e): use the 3 letter value for the ability (e.g. str)
  * Skill (dnd5e): use the 3 letter value for the skill (e.g. itm)
  * Attack Roll (dnd5e): use the item name making the attack (e.g. Longbow)
  * Damage Roll (dnd5e): use the item name making the damage roll (e.g. Longbow)
* **Compendium:** choose the compendium from which the roll table or playlist will be found. Note that this overrides your default compendium set in your Token Says settings. If you have selected in your settings to search your world's playlists or rollable tables first, those will be searched before going to this compendium. This can be left blank for rollable table rules if you have entered something in the 'Token Says' field.
* **Source Name:** The name of the rollable table or playlist. This can be left blank for rollable table rules if you have entered something in the 'Token Says' field.
* **Token Says:** Use this to bypass randomization. Type in here what the token will say. For audio files, this is the name of the file to play for the given playlist.
* **Likelihood:** Set on a scale of 1 to 100 what percent of the time the token will say something for this given rule. For example, a 33 here for a rule that triggers on initiave rolls will cause the token to say something 33% of the time when they roll initiative.

## Game Module Settings

### Activate Token Says (World)
Useful for situations where you want to quickly toggle Token Says on or off without a full session reload.

### Suppress Tokens Says on Private GM Rolls (World)
When roll mode is set to Private GM Roll, the Token Says audio, chat message and chat bubble will be suppressed.

### Suppress Token Says Chat Bubbles (Client)
By default a chat bubble is generated each time a Token Says rule is hit. Here you can prevent it on audio based rules, rollable table based rules, or all rules.

### Suppress Token Says Chat Message (Client)
By default a chat message is generated each time a Token Says rule is hit. Here you can prevent it on audio based rules, rollable table based rules, or all rules.

### Suppress Token Says Audio (Client)
Audio sounds caused by Token Says rules will not generate.

### Search World's Playlist's First (World)
If you have a playlist in your world the matches the Token Says rule, it will use that instead of searching your compendium. If not selected, world playlists are ignored.

### Search World's Rollable Tables First (World)
If you have a rollable table in your world the matches the Token Says rule, it will use that instead of searching your compendium. If not selected, world rollable tables are ignored.

### Default Playlist Compendium
This is the compendium that will be accessed by default when determining where the rule's playlist is stored. Individual rules may override this default. If a rule's compendium is left blank then the default compendium is used.

### Default Rollable Table Compendium
This is the compendium that will be accessed by default when determining where the rule's audio file is stored. Individual rules may override this default. If a rule's compendium is left blank then the default compendium is used.

## API / Macro Use
The tokenSays.says(token, actor, actionName) function is made available for use within you macros and scripts. The function generates a Token Says message if a rule is found that matches the parameters that you pass in. The return from this function is the Token Says rule data for the rule identified by this function. 

To use this function you must have Token Says installed as a module and active and must have a rule with action type = "Macro (API)" with an token/actor name and action name that match what is passed into the function.
* token (optional) - the token.id. Though optional, either this or actor must be passed in, else the function will be escaped
* actor (optional) - the actor.id. Can be derived from token if not provided.
* actionName - this must match to your Token Says rule "Action Name" for the given actor or token. Typically this is the name of the item.

## Compatibility
* Midi-Qol: Token Says supports Midi-Qol functionality (tested in DND5e only)
* Polyglot: Token Says integrates with Polyglot in order to translate the token's speech using the current option in the chat message area. Currently only chat bubbles are configured but chat messages are in the works.

## Note To Developers
* The flag of `flags: {TOKENSAYS: {cancel: true}}` within the chatMessage.Create() options can be used to escape out of Token Says. Add this flag to prevent Token Says from generating a chat message off of a specific message that you may create.
* Token Says uses Developer Mode Module for console.log output. By enabling Token Says through Developer Mode Debug you can gain access to the key events generated by Token Says workflow.

## Enhancements
See a list of upcoming enhancements on the project board https://github.com/napolitanod/Token-Says/projects/1

## Acknowledgements
* Thank you to Calego for their walkthrough on Foundry VTT module building (https://hackmd.io/@akrigline/ByHFgUZ6u/%2FNBub2oFIT6yeh4NlOGTVFw), this helped me quickly pick up the  basics. 
* If you use Monk's Enhanced Journal you'll see that the layout on one of my forms shares inspiration (and some CSS) from his ironmonk's module (https://github.com/ironmonk88)
* Thank you to everybody in the League of Extraordinary Developers Discord for their assistance in answering questions and troubleshooting

