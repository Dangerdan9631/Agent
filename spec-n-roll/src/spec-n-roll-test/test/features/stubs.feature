Feature: Stub packages

  Scenario: The test executable reports its package name
    When the test executable is run
    Then the executable output is "spec-n-roll-test"
