(function() {
    'use strict';

    try {
        const MIN_SCALE = 0.1,
              MAX_SCALE = 1,
              TALKING_TEP_SIZE = 0.002,
              SILENT_STEP_SIZE = 0.002,
              CHECK_TALKING_INTERVAL = 100,
              RELOAD_PARTICIPANTS_INTERVAL = 3000,
              GOOGLE_MEET_NO_SOUND_ICON_CLASS = 'gjg47c'; // Base state class for active mic, likely to break

        let participants = [],
            currentScales = {},
            checkTalkersInterval,
            updateParticipantsInterval,
            active = false;

        function _addToggleButton() {
            try {
                const moreOptionsIcon = document.evaluate('//*[text()="more_vert"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                if (!moreOptionsIcon) {
                    console.warn('[Google Meet Shrink] Options button not found, retrying…');

                    return false;
                }

                console.log('[Google Meet Shrink] Found options menu button. Adding shrinker option');

                moreOptionsIcon.closest('button').addEventListener('click', () => _onOptionsMenuOpen());

                return true;
            } catch(e) {
                console.error('[Google Meet Shrink] Error while adding menu handler', e);

                return false;
            }
        }

        function _onOptionsMenuOpen(tries = 0) {
            try {
                const menuList = document.querySelector('body > div > ul');

                if (!menuList) {
                    if (tries < 30) {
                        setTimeout(() => _onOptionsMenuOpen(++tries), 100);
                    } else {
                        console.warn('[Google Meet Shrink] Could not find options menu in time. Stopped trying.');
                    }

                    return;
                }

                const separator = menuList.querySelector('[role="separator"]').cloneNode(true),
                      toggleButton = document.evaluate('//li/*[contains(translate(text(), "F", "f"), "full screen")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.closest('li').cloneNode(true);

                toggleButton.lastChild.innerText = 'Toggle Shrink';
                toggleButton.removeAttribute('jsaction');
                toggleButton.addEventListener('click', _onToggleListener);

                menuList.appendChild(separator);
                menuList.appendChild(toggleButton);
            } catch(e) {
                console.error('[Google Meet Shrink] Error while adding menu option', e);
            }
        }

        function _onToggleListener() {
            if (active) {
                _stop();
            } else {
                _init();
            }
        }

        function _isTalking(participant) {
            return getComputedStyle(participant.voiceEl).display !== 'none' && !participant.voiceEl.classList.contains(GOOGLE_MEET_NO_SOUND_ICON_CLASS); // Mic icon visible, and not in base state
        }

        function _isPerson(participant) {
            return !(participant.el.querySelector('[data-self-name="You"]')?.innerText.includes('Presentation') ?? false);
        }

        function _getParticipantInfo(participantEl) {
            return {
                id: participantEl.getAttribute('data-requested-participant-id'),
                el: participantEl,
                voiceEl: participantEl.querySelector(':scope > div + div > div:first-child > div:first-child')
            };
        }

        function _getParticipants() {
            participants = [...document.querySelectorAll('[data-requested-participant-id]')].map(_getParticipantInfo);
        }

        function _checkTalkers() {
            participants.forEach((participant) => {
                let newScale;

                if (!_isPerson(participant)) {
                    newScale = 1;
                } else if (_isTalking(participant)) {
                    newScale = Math.max(MIN_SCALE, currentScales[participant.id] - TALKING_TEP_SIZE);
                } else {
                    newScale = Math.min(MAX_SCALE, currentScales[participant.id] + SILENT_STEP_SIZE);
                }

                if (newScale !== currentScales[participant.id]) {
                    currentScales[participant.id] = newScale;
                    participant.el.style.transform = `scale(${newScale})`;
                }
            });
        }

        function _setupParticipants() {
            _getParticipants();

            participants.forEach((participant) => {
                if(typeof currentScales[participant.id] === 'undefined') {
                    currentScales[participant.id] = 1;
                }
                participant.el.style.transition = `transform ${CHECK_TALKING_INTERVAL}ms linear`;
            });
        }

        function _clearScales() {
            currentScales = {};

            document.querySelectorAll('[data-requested-participant-id]').forEach((el) => {
                el.style.transform = '';
            });
        }

        function _init() {
            _setupParticipants();
            updateParticipantsInterval = setInterval(_setupParticipants, RELOAD_PARTICIPANTS_INTERVAL);
            checkTalkersInterval = setInterval(_checkTalkers, CHECK_TALKING_INTERVAL);
            active = true;
        }

        function _stop() {
            clearInterval(updateParticipantsInterval);
            clearInterval(checkTalkersInterval);
            _clearScales();
            active = false;
        }

        const menuInterval = setInterval(() => {
            _setupParticipants();
            if (participants.length > 0 && _addToggleButton()) {
                clearInterval(menuInterval);
            }
        }, 1000);

        console.log('[Google Meet Shrink] Loaded!');
    } catch(e) {
        console.error('[Google Meet Shrink] General exception', e);
    }
})();
