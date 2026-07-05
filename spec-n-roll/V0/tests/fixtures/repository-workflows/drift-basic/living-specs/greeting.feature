@greeting
Feature: Greeting users

  Scenario: User receives a greeting
    Given a signed-in user named "Ada"
    When the greeting is requested
    Then the user sees "Hello, Ada"

  Scenario: Empty name is rejected
    Given a signed-in user with an empty name
    When the greeting is requested
    Then the request is rejected with "Name is required"
