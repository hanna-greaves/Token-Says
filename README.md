![all versions](https://img.shields.io/github/downloads/napolitanod/Token-Says/total) 
![Latest Release Download Count](https://img.shields.io/github/downloads/napolitanod/Token-Says/latest/module.zip)
[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Ftoken-says&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=token-says)
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Ftoken-says%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/token-says/)


# Token Says
Bring some penache into your world. With Token Says, make tokens speak dialog or play audio based on in game actions. Use rolltables and playlists to randomize what tokens say. 

![Animation](https://user-images.githubusercontent.com/22696153/127725224-f9af308d-fcfb-4f2b-a090-f267348928c6.gif)

> Pesky goblins harrass an Azure as they attack. Uses 'Insults For A Lawful Good Character Using Vicious Mockery' rolltable from FVTT Community Tables module in order to randomize through 100 insults.

# Beta (WARNING)
This module is in beta. There may be additional changes to the API or functions or data structure as feature use becomes refined. Please keep your rules to a minimum to avoid too much lost work. Though I am designing not to be system specific, so far this is only tested in DND5E (though confirmed to work in PF2E).

## Why Use?
A halfling archer that says little quips whenever they score a hit with their shortbow. A samurai warrior that expresses various teachings with each katana strike. A lion that roars on occasional bites. All of these things are possible with Token Says.

Token Says rules are fully customizable by the GM and are designed to be flexible to your needs. Alleviate some of the burden of being a GM and give your players access to edit their own character's phrases by linking a rule to a rollable table that they have permission to edit. Or, make it simple and link to an existing compendium's rollable table! Don't think that halfling archer would come up with a quip every time? No sweat! Set a likelihood for how often a token will say a particular rule and Token Says will only trigger that percent of the time.

## How it Works
The Token Says feature uses a set of Token Says rules that you create for your world in order to auto generate chat messages, chat bubbles and audio sounds when specific tokens or actors do something. The token may say the same thing every time or it can be randomized using a playlist or rollable table. Other features include:
* Use of compendium data so that the rollable tables and playlists do not need to be in your world (though you can use your world's data too).
* Rules can be specific to a certain action (e.g. token performs an attack roll with a warhammer) or generic (e.g. token performs an ability check).
* Likelihood can be set so that the token doesn't always say something. For example, with a likelihood of 10 set for a token's initiative check, they will only say something on 10% of their initiative rules.


## Token Says Rules

![image](https://user-images.githubusercontent.com/22696153/127783611-fefc7dec-0075-4406-ac33-906f15bc57ac.png)

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
  * Macro (API): see the API section below for details on how this is used
* **Compendium:** choose the compendium from which the roll table or playlist will be found. Note that this overrides your default compendium set in your Token Says settings. If you have selected in your settings to search your world's playlists or rollable tables first, those will be searched before going to this compendium. This can be left blank for rollable table rules if you have entered something in the 'Token Says' field.
* **Source Name:** The name of the rollable table or playlist. This can be left blank for rollable table rules if you have entered something in the 'Token Says' field.
* **Token Says:** Use this to bypass randomization. Type in here what the token will say. For audio files, this is the name of the file to play for the given playlist.
* **Likelihood:** Set on a scale of 1 to 100 what percent of the time the token will say something for this given rule. For example, a 33 here for a rule that triggers on initiave rolls will cause the token to say something 33% of the time when they roll initiative.

## Game Module Settings
See wiki https://github.com/napolitanod/Token-Says/wiki/Game-Module-Settings

## Save Your Configured Rules
Your rules can be easily exported from the Token Says rules configuration window using the export button to the right of the search bar.

## Import Rules and Share Between Worlds
Your rules, or rules from others, can be imported into your world. Imports add new rules and do not delete existing rules. Any rule in the import file that shares an id with a rule in your world will be skipped. Note that some rules may need further configuration after import if compendiums or modules differ between your worlds.

## API / Macro Use
The tokenSays.says(token, actor, actionName) function is made available for use within you macros and scripts. The function generates a Token Says message if a rule is found that matches the parameters that you pass in. The return from this function is the Token Says rule data for the rule identified by this function. 

To use this function you must have Token Says installed as a module and active and must have a rule with action type = "Macro (API)" with an Token Name that matches the alias of the token or name of the actor that you pass into the function as well as an Action Name that matches the actionName passed into the function.
* token (optional) - the token.id. Though optional, either this or actor must be passed in, else the function will be escaped
* actor (optional) - the actor.id. Can be derived from token if not provided.
* actionName - this must match to your Token Says rule "Action Name" for the given actor or token. Typically this is the name of the item.

## Compatibility
* Midi-Qol: Token Says supports Midi-Qol functionality (tested in DND5e only)
* Polyglot: Token Says integrates with Polyglot in order to translate the token's speech using the current option in the chat message area. Both chat bubbles and chat message are transformed by polyglot.

## Note To Developers
* The flag of `flags: {TOKENSAYS: {cancel: true}}` within the chatMessage.Create() options can be used to escape out of Token Says. Add this flag to prevent Token Says from generating a chat message off of a specific message that you may create.
* Token Says uses Developer Mode Module for console.log output. By enabling Token Says through Developer Mode Debug you can gain access to the key events generated by Token Says workflow.

## Enhancements
See a list of upcoming enhancements on the project board https://github.com/napolitanod/Token-Says/projects/1

## Acknowledgements
* Thank you to Calego for their walkthrough on Foundry VTT module building (https://hackmd.io/@akrigline/ByHFgUZ6u/%2FNBub2oFIT6yeh4NlOGTVFw), this helped me quickly pick up the  basics. 
* If you use Monk's Enhanced Journal you'll see that the layout on one of my forms shares inspiration (and some CSS) from his ironmonk's module (https://github.com/ironmonk88)
* Thank you to everybody in the League of Extraordinary Developers Discord for their assistance in answering questions and troubleshooting

