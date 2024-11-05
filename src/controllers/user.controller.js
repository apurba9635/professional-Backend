import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const signUpUser = asyncHandler(async (req, res) => {
  //   res.status(200).json({
  //     message: "ok",
  //   });

  //get details
  //empty check
  //check user exits or not using fullname, email
  //crete object for user
  //remove passw and refresht from res
  //check user create or not
  //return res

  const { fullname, email, password } = req.body;

  if ([fullname, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, `All fields are required`);
  }

  const exitedUser = await User.findOne({
    $or: [{ fullname }, { email }],
  });

  if (exitedUser) {
    throw new ApiError(409, `User already exist`);
  }

  const user = await User.create({
    fullname,
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Internal server error");
  }

  return res.status(200).json(new ApiResponse(200, createdUser));
});

export { signUpUser };
