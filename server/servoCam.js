'use strict';

const logger = require('./logger').logger('SERVO-CAM');
const { Gpio } = require('pigpio');
const GpioDef = require('./rpiGpioDef');

//-----------------------------------------------------------------------------
// Constants definitions
//-----------------------------------------------------------------------------
const DEFAULT_GPIO_CAM_H_SERVO = GpioDef.BCM.GPIO7; // Default value for the horizontal servo motor GPIO pin.
const DEFAULT_GPIO_CAM_V_SERVO = GpioDef.BCM.GPIO6; // Default value for the vertical servo motor GPIO pin.
const DEFAULT_HORIZONTAL_CENTER = 1500;             // Default value for the horizontal centered valued.
const DEFAULT_VERTICAL_CENTER = 1500;               // Default value for the vertical centered valued.
const MIN_SERVO_WRITE_VALUE = 500;                  // Minimum value for the servo motor.
const MAX_SERVO_WRITE_VALUE = 2500;                 // Maximum value for the servo motor.

/**
 * Initializes the servo motors to control the position of the camera.
 *
 * @param {object} [config] - The servo motors configuration parameters.
 * @param {number} [config.hServoGpio=DEFAULT_GPIO_CAM_H_SERVO] - The GPIO number to control the horizontal servo motor.
 * @param {number} [config.vServoGpio=DEFAULT_GPIO_CAM_V_SERVO] - The GPIO number to control the vertical servo motor.
 */
const ServoCam = function ({
    hServoGpio = DEFAULT_GPIO_CAM_H_SERVO,
    vServoGpio = DEFAULT_GPIO_CAM_V_SERVO
} = {}) {
    logger.info('Initializing servoCam...');

    const _that = this;
    const vCamServo = new Gpio(hServoGpio, { mode: Gpio.OUTPUT });
    const hCamServo = new Gpio(vServoGpio, { mode: Gpio.OUTPUT });

    let currentHPos;
    let currentVPos;
    let _onStatusChange = function () {};

    /**
     * Builds the servo motors status object.
     *
     * @returns {object} - The servo motors status objects.
     */
    const getStatus = () => ({
        horizontal: currentHPos,
        vertical: currentVPos
    });

    /**
     * Sets the position of the camera based on current servo calues.
     */
    function setPosition() {
        logger.info(`Setting servoCam position to H ${currentHPos}, V ${currentVPos}`);
        hCamServo.servoWrite(currentHPos);
        vCamServo.servoWrite(currentVPos);
        _onStatusChange(getStatus());
    }

    /**
     * Moves the camera to the given values.
     *
     * @param {number} horizontal - Degrees to move the camera horizontally.
     * @param {number} vertical - Degrees to move the camera vertically.
     */
    this.move = (horizontal, vertical) => {
        const newHPos = currentHPos + horizontal;
        const newVPos = currentVPos + vertical;
        currentHPos = Math.min(Math.max(newHPos, MIN_SERVO_WRITE_VALUE), MAX_SERVO_WRITE_VALUE);
        currentVPos = Math.min(Math.max(newVPos, MIN_SERVO_WRITE_VALUE), MAX_SERVO_WRITE_VALUE);
        setPosition();
    };

    this.absolutePosition = (horizontal, vertical) => {
        currentHPos = Math.min(Math.max(horizontal, MIN_SERVO_WRITE_VALUE), MAX_SERVO_WRITE_VALUE);
        currentVPos = Math.min(Math.max(vertical, MIN_SERVO_WRITE_VALUE), MAX_SERVO_WRITE_VALUE);
        setPosition();
    };

    this.getStatus = getStatus;

    /**
     * Sets the listener for servo status changes.
     *
     * @param {Function} onStatusChange - The listener to invoke everytime the servo status changes.
     */
    this.setOnStatusChange = onStatusChange => {
        if (typeof onStatusChange !== 'function') {
            logger.error('OnStatusChange listerner is not a function');
            return;
        }
        _onStatusChange = onStatusChange;
    };

    /**
     * Terminates the servo motors controller.
     */
    this.terminate = () => {
        _onStatusChange = function () {};
    };

    _that.absolutePosition(DEFAULT_HORIZONTAL_CENTER, DEFAULT_VERTICAL_CENTER);

    logger.info('Initialized servoCam');
};

module.exports = ServoCam;
