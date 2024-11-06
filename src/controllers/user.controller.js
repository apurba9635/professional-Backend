import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong to generate access and refresh tokens "
    );
  }
};

const signUpUser = asyncHandler(async (req, res) => {
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
    fullname: fullname,
    email: email,
    password: password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Internal server error");
  }

  return res.status(200).json(new ApiResponse(200, createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body +data
  //user data
  //find the user
  //password check
  //accesstoken and refreshtoken
  //send cookie

  const { fullname, email, password } = req.body;

  if (!fullname && !email) {
    throw new ApiError(400, "fullname and email is required");
  }

  const user = await User.findOne({
    $or: [{ fullname }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User is not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"));
});
export { signUpUser, loginUser, logoutUser };
