# Stockfish (GPL-3.0) built from source for on-device analysis (phase 05).
#
# Sources come from the pinned git submodule android/third_party/stockfish —
# no prebuilt binary is ever committed. The engine is compiled as a position-
# independent *executable* but named libstockfish.so so the Android Gradle
# plugin packages it into the APK; the app then executes it from
# ApplicationInfo.nativeLibraryDir and speaks UCI over stdin/stdout
# (see com.chesslab.tracker.analysis.StockfishEngine).
#
# The NNUE networks (required by Stockfish's evaluation since SF 16) are
# downloaded at configure time into the CMake build directory (gitignored)
# and embedded via incbin, mirroring what the upstream Makefile's `net`
# target does. The expected SHA-256 prefix is part of the file name.

cmake_minimum_required(VERSION 3.22)
project(chesslab_stockfish CXX)

set(SF_SRC "${CMAKE_CURRENT_SOURCE_DIR}/../../../../third_party/stockfish/src")

if(NOT EXISTS "${SF_SRC}/main.cpp")
    message(FATAL_ERROR
        "Stockfish sources not found at ${SF_SRC}. "
        "Run: git submodule update --init android/third_party/stockfish")
endif()

# --- NNUE networks -----------------------------------------------------------
# Read the default net names from evaluate.h so a submodule bump cannot desync.
file(STRINGS "${SF_SRC}/evaluate.h" SF_NET_LINES REGEX "EvalFileDefaultName(Big|Small)")
string(REGEX MATCH "EvalFileDefaultNameBig[ \t]+\"([^\"]+)\"" _ "${SF_NET_LINES}")
set(SF_NET_BIG "${CMAKE_MATCH_1}")
string(REGEX MATCH "EvalFileDefaultNameSmall[ \t]+\"([^\"]+)\"" _ "${SF_NET_LINES}")
set(SF_NET_SMALL "${CMAKE_MATCH_1}")
if(NOT SF_NET_BIG OR NOT SF_NET_SMALL)
    message(FATAL_ERROR "Could not parse NNUE net names from ${SF_SRC}/evaluate.h")
endif()

# Download a net into the build dir and verify the SHA-256 prefix that is
# embedded in its file name (nn-<12 hex chars of sha256>.nnue).
function(chesslab_fetch_net NET_NAME)
    set(NET_PATH "${CMAKE_CURRENT_BINARY_DIR}/${NET_NAME}")
    string(REGEX MATCH "nn-([0-9a-f]+)\\.nnue" _ "${NET_NAME}")
    set(EXPECTED_PREFIX "${CMAKE_MATCH_1}")
    if(EXISTS "${NET_PATH}")
        file(SHA256 "${NET_PATH}" EXISTING_SHA)
        string(FIND "${EXISTING_SHA}" "${EXPECTED_PREFIX}" PREFIX_POS)
        if(PREFIX_POS EQUAL 0)
            return()
        endif()
        file(REMOVE "${NET_PATH}")
    endif()
    message(STATUS "Downloading NNUE network ${NET_NAME}")
    file(DOWNLOAD "https://data.stockfishchess.org/nn/${NET_NAME}" "${NET_PATH}"
        STATUS DOWNLOAD_STATUS)
    list(GET DOWNLOAD_STATUS 0 DOWNLOAD_CODE)
    if(NOT DOWNLOAD_CODE EQUAL 0)
        message(FATAL_ERROR "Failed to download ${NET_NAME}: ${DOWNLOAD_STATUS}")
    endif()
    file(SHA256 "${NET_PATH}" NET_SHA)
    string(FIND "${NET_SHA}" "${EXPECTED_PREFIX}" PREFIX_POS)
    if(NOT PREFIX_POS EQUAL 0)
        message(FATAL_ERROR "SHA-256 mismatch for ${NET_NAME}: got ${NET_SHA}")
    endif()
endfunction()

chesslab_fetch_net("${SF_NET_BIG}")
chesslab_fetch_net("${SF_NET_SMALL}")

# --- Engine target -----------------------------------------------------------
# Source list mirrors SRCS in the upstream Makefile (src/Makefile).
set(SF_SOURCES
    "${SF_SRC}/benchmark.cpp"
    "${SF_SRC}/bitboard.cpp"
    "${SF_SRC}/engine.cpp"
    "${SF_SRC}/evaluate.cpp"
    "${SF_SRC}/main.cpp"
    "${SF_SRC}/memory.cpp"
    "${SF_SRC}/misc.cpp"
    "${SF_SRC}/movegen.cpp"
    "${SF_SRC}/movepick.cpp"
    "${SF_SRC}/nnue/features/full_threats.cpp"
    "${SF_SRC}/nnue/features/half_ka_v2_hm.cpp"
    "${SF_SRC}/nnue/network.cpp"
    "${SF_SRC}/nnue/nnue_accumulator.cpp"
    "${SF_SRC}/nnue/nnue_misc.cpp"
    "${SF_SRC}/position.cpp"
    "${SF_SRC}/score.cpp"
    "${SF_SRC}/search.cpp"
    "${SF_SRC}/syzygy/tbprobe.cpp"
    "${SF_SRC}/thread.cpp"
    "${SF_SRC}/timeman.cpp"
    "${SF_SRC}/tt.cpp"
    "${SF_SRC}/tune.cpp"
    "${SF_SRC}/uci.cpp"
    "${SF_SRC}/ucioption.cpp"
)

add_executable(stockfish ${SF_SOURCES})

# Executable dressed as a shared library: AGP only packages lib*.so files.
set_target_properties(stockfish PROPERTIES
    OUTPUT_NAME "stockfish"
    PREFIX "lib"
    SUFFIX ".so"
)

target_compile_features(stockfish PRIVATE cxx_std_17)
target_include_directories(stockfish PRIVATE "${SF_SRC}")

# Flags mirror the upstream Makefile release build (minus LTO/PGO, which are
# not worth the build cost here).
target_compile_options(stockfish PRIVATE
    -O3 -funroll-loops -fno-exceptions -Wall
)
target_compile_definitions(stockfish PRIVATE
    NDEBUG
    USE_PTHREADS
)

# Architecture tuning per ABI (Makefile: armv8 / x86-64-sse41-popcnt).
if(ANDROID_ABI STREQUAL "arm64-v8a")
    target_compile_definitions(stockfish PRIVATE IS_64BIT USE_POPCNT USE_PREFETCH USE_NEON=8)
elseif(ANDROID_ABI STREQUAL "x86_64")
    target_compile_definitions(stockfish PRIVATE IS_64BIT USE_POPCNT USE_PREFETCH)
    target_compile_options(stockfish PRIVATE -msse -msse2 -mssse3 -msse4.1 -mpopcnt)
else()
    message(FATAL_ERROR "Unsupported ABI for Stockfish: ${ANDROID_ABI} (add flags here)")
endif()

# incbin's `.incbin` resolves relative paths against the assembler's working
# directory, which for Ninja is the build dir — where the nets were downloaded.
# Belt and braces: also pass the build dir as an include search path.
target_include_directories(stockfish PRIVATE "${CMAKE_CURRENT_BINARY_DIR}")
