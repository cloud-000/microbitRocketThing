function calculateSpeed (speed: number) {
    return speedBoost + speedMult * speed
}
function boostColor (color: number) {
    maqueenPlusV2.setIndexColor(DigitalPin.P15, 1, color)
    maqueenPlusV2.setIndexColor(DigitalPin.P15, 2, color)
}
function ActivateBoost (speedlevel: number) {
    boostColor(maqueenPlusV2.rgb(255, 0, 0))
    powerTime = 2500 + speedlevel * 1500
    radio.sendValue("rumble", powerTime)
    powerStage1Time = 100 + speedlevel * 50
    speedBoost = 0
    speedMult = 2.25 + 0
    powerActivateTime = currentTime
    am_I_speed_boosting = 1
}
/**
 * 0 is on
 * 
 * 1 is off
 */
function controlLoop () {
    currentTime = control.millis()
    xin = pins.map(
    pins.analogReadPin(AnalogReadWritePin.P1),
    0,
    1023,
    -1,
    1
    )
    yin = pins.map(
    pins.analogReadPin(AnalogReadWritePin.P2),
    0,
    1023,
    -1,
    1
    )
    radio.sendValue("x", xin)
    radio.sendValue("y", yin)
    red = pins.digitalReadPin(DigitalPin.P15)
    serial.writeValue("z", red)
    if (red != oldRed) {
        if (red == 0) {
            radio.sendString("speed-boost")
        }
    }
    oldRed = red
    pins.setPull(DigitalPin.P15, PinPullMode.PullUp)
    if (currentTime - lastRumbleTime > rumblingTime) {
        pins.analogWritePin(AnalogPin.P12, 0)
    }
}
function controlStart () {
    pins.analogWritePin(AnalogPin.P12, 0)
}
function onTape (thresh: number) {
    return maqueenPlusV2.readLineSensorData(maqueenPlusV2.MyEnumLineSensor.SensorL1) < thresh || maqueenPlusV2.readLineSensorData(maqueenPlusV2.MyEnumLineSensor.SensorM) < thresh || maqueenPlusV2.readLineSensorData(maqueenPlusV2.MyEnumLineSensor.SensorR1) < thresh
}
function carStart () {
    maqueenPlusV2.I2CInit()
    maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor)
    normal_speed_max = 80
    lmotor = 0
    rmotor = 0
    speedMult = 1
    turnMult = 1
    powerTime = 2500
    powerStage1Time = 200
    powerActivateTime = 0
    speedBoost = 0
    am_I_speed_boosting = 0
    speedBoostCounter = 0
    lastOnTapeTime = -1000
}
radio.onReceivedString(function (receivedString) {
    if (receivedString == "speed-boost") {
        if (am_I_speed_boosting == 0) {
            if (speedBoostCounter > 0) {
                ActivateBoost(speedBoostCounter)
            }
        }
    }
})
radio.onReceivedValue(function (name, value) {
    if (name == "x") {
        xin = deadzone(value)
    }
    if (name == "y") {
        yin = deadzone(value)
    }
    if (name == "rumble") {
        pins.analogWritePin(AnalogPin.P12, 1023)
        rumblingTime = value
        lastRumbleTime = currentTime
    }
    if (name == "speed-boost-counter") {
        basic.showNumber(value)
    }
})
function deadzone (num: number) {
    if (Math.abs(num) < 0.15) {
        return 0
    }
    return num
}
function carLoop () {
    currentTime = control.millis()
    if (am_I_speed_boosting == 1) {
        if (Math.abs(xin) > 0.9) {
            turnMult = 0.5
        } else {
            turnMult = 0.9
        }
    } else {
        if (Math.abs(xin) > 0.75) {
            turnMult = 0.75
        } else {
            turnMult = 0.9
        }
    }
    lmotor = xin * turnMult + yin
    rmotor = yin - xin * turnMult
    lmotor = lmotor * normal_speed_max
    rmotor = rmotor * normal_speed_max
    if (yin < -0.1) {
        temp = rmotor
        rmotor = lmotor
        lmotor = temp
    }
    if (rmotor < 0) {
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Backward, calculateSpeed(Math.abs(rmotor)))
    } else {
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, calculateSpeed(rmotor))
    }
    if (lmotor < 0) {
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Backward, calculateSpeed(Math.abs(lmotor)))
    } else {
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, calculateSpeed(lmotor))
    }
    if (am_I_speed_boosting == 1) {
        if (currentTime - powerActivateTime > powerStage1Time) {
            speedBoost = 0
            if (currentTime - powerActivateTime > powerTime) {
                boostColor(maqueenPlusV2.rgb(0, 0, 0))
                speedMult = 1
                speedBoost = 0
                am_I_speed_boosting = 0
                speedBoostCounter = 0
            }
        }
    } else {
        if (onTape(60)) {
            if (canIncrementSpeedCounter == 1 && currentTime - lastOnTapeTime >= 1000) {
                canIncrementSpeedCounter = 0
                speedBoostCounter = Math.min(speedBoostCounter + 1, 4)
                radio.sendValue("rumble", 500)
                radio.sendValue("speed-boost-counter", speedBoostCounter)
                if (speedBoostCounter == 1) {
                    boostColor(maqueenPlusV2.rgb(150, 100, 100))
                } else if (speedBoostCounter == 2) {
                    boostColor(maqueenPlusV2.rgb(180, 100, 100))
                } else if (speedBoostCounter == 3) {
                    boostColor(maqueenPlusV2.rgb(200, 75, 75))
                } else {
                    boostColor(maqueenPlusV2.rgb(250, 30, 30))
                }
                lastOnTapeTime = currentTime
            }
        } else {
            if (canIncrementSpeedCounter == 0) {
                canIncrementSpeedCounter = 1
            }
        }
    }
}
let canIncrementSpeedCounter = 0
let temp = 0
let lastOnTapeTime = 0
let speedBoostCounter = 0
let turnMult = 0
let rmotor = 0
let lmotor = 0
let normal_speed_max = 0
let rumblingTime = 0
let lastRumbleTime = 0
let oldRed = 0
let red = 0
let yin = 0
let xin = 0
let am_I_speed_boosting = 0
let currentTime = 0
let powerActivateTime = 0
let powerStage1Time = 0
let powerTime = 0
let speedMult = 0
let speedBoost = 0
radio.setGroup(67)
controlStart()
basic.forever(function () {
    controlLoop()
})
basic.forever(function () {
	
})
