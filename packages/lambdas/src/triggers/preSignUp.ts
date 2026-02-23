import type { PreSignUpTriggerHandler } from "aws-lambda";

export const handler: PreSignUpTriggerHandler = async (event) => {
    // Auto-confirm user so Cognito does not require ConfirmSignUp
    event.response.autoConfirmUser = true;

    // Mark email as verified
    event.response.autoVerifyEmail = true;

    return event;
};