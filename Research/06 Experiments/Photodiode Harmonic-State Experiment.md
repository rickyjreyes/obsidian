---
id: EXP-PHOTODIODE-HARMONIC-STATE
type: experiment
title: Photodiode Harmonic-State Experiment
object_state: canonical
priority_included: true
scientific_importance: 78
work_urgency: 88
critical_path: true
symbolic_status: NOT_APPLICABLE
formal_status: NOT_APPLICABLE
physical_status: UNREVIEWED
experimental_status: UNREVIEWED
replication_status: not-replicated
source_papers:
  - Research/01 Literature Notes/Photodiode Harmonic State Protocol Ledger.md
components:
  - Research/02 Concepts/Photodiode.md
  - Research/02 Concepts/Ultraviolet illumination.md
  - Research/02 Concepts/Angular modulation.md
  - Research/02 Concepts/Optical excitation.md
  - Research/02 Concepts/State induction.md
  - Research/02 Concepts/Persistent electrical states.md
  - Research/02 Concepts/Harmonic spectrum.md
  - Research/02 Concepts/Threshold dynamics.md
  - Research/02 Concepts/Protocol registration.md
  - Research/02 Concepts/Experimental ledger.md
---

# Photodiode Harmonic-State Experiment

## Purpose

Canonical experiment record for testing whether controlled optical excitation and modulation produce a reproducible, long-lived electrical or harmonic state in a photodiode beyond ordinary device memory, heating, instrumentation drift, or environmental effects.

## Prediction

A controlled excitation protocol may produce a repeatable post-excitation electrical or spectral state with a measurable lifetime, threshold, and harmonic structure that differs from matched controls.

This remains a testable research prediction, not an established physical effect.

## Equipment

- Photodiode and documented part number
- Optical source with measured wavelength and power
- Ultraviolet source when used
- Modulation source and calibrated frequency reference
- Bias supply
- Transimpedance amplifier
- Oscilloscope or data-acquisition system
- Temperature sensor at the device
- Optical power meter
- Shielding and dark enclosure

## Independent variables

- Optical wavelength
- Optical power
- Exposure duration
- Modulation frequency and waveform
- Modulation depth
- Photodiode bias
- Device temperature
- Recovery time between trials

## Dependent variables

- Photocurrent or output voltage
- Harmonic amplitudes and phases
- Post-excitation decay time
- Threshold for state induction
- Trial-to-trial repeatability
- Difference from dark, sham, and thermal controls

## Protocol

1. Record device identity, calibration state, room conditions, and initial temperature.
2. Acquire a pre-exposure baseline using the full measurement chain.
3. Run randomized control and excitation trials.
4. Record optical power, waveform, exposure duration, bias, and temperature continuously.
5. Preserve raw time-series data without smoothing or baseline correction.
6. Apply the preregistered analysis to blinded trial labels.
7. Repeat across devices, days, and operators.

## Controls

- Dark control
- Sham modulation control
- Equal-heating optical control
- Unbiased-device control
- Alternate photodiode control
- Electronics-only control with the detector disconnected or replaced by a dummy load
- Randomized trial order

## Calibration

- Optical power calibration
- Frequency-reference calibration
- Amplifier gain and bandwidth calibration
- Oscilloscope amplitude and time-base verification
- Temperature sensor calibration

## Expected result

A valid positive result requires a preregistered signal metric that exceeds control distributions, survives correction for multiple comparisons, repeats across independent trials, and cannot be explained by temperature, detector hysteresis, amplifier recovery, or acquisition artifacts.

## Reported observation state

Long-lived and harmonic behavior has been reported in project notes. The canonical experiment remains **unreviewed** until raw data, calibration records, complete controls, uncertainty analysis, and independent replication are attached here.

## Uncertainty

Record measurement uncertainty for optical power, frequency, voltage/current, timing, temperature, baseline subtraction, and fitted decay constants.

## Null result criterion

The result is null when the preregistered metric is statistically indistinguishable from controls or disappears after thermal, electronic, or analysis-artifact corrections.

## Falsifier

The proposed nonordinary state-induction interpretation is rejected when matched controls reproduce the effect, when the signal tracks ordinary temperature or amplifier recovery, or when blinded replication fails within the declared uncertainty and power analysis.

## Raw data

- [ ] Raw time-series files linked
- [ ] Calibration files linked
- [ ] Trial manifest linked
- [ ] Analysis notebook linked
- [ ] Figures reproducible from raw data

## Replication

- **Internal replication:** not yet recorded in this canonical object
- **Independent replication:** none recorded

## What is missing

- [ ] Freeze the exact prediction and primary endpoint
- [ ] Attach the complete protocol and randomization scheme
- [ ] Attach raw data and calibration records
- [ ] Quantify uncertainty and statistical power
- [ ] Complete thermal and electronics controls
- [ ] Record null results and unsuccessful trials
- [ ] Obtain independent replication
