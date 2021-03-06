/**
 *
 */
app.controller('carvingController', ['$scope', 'luckyService', 'luckyFactory', '$interval', '$http', '$translate', 'addressAnalyticsService', '$window', 'keyGenerationService', '$timeout', 'luckyConstants', function ($scope, luckyService, luckyFactory, $interval, $http, $translate, addressAnalyticsService, $window, keyGenerationService, $timeout, luckyConstants) {

    var vm = this;

    var CarverFlipMode = {
        NO_FLIP: "NO_FLIP",
        FLIP_GOR: "FLIP_GOR",
        FLIP_VER: "FLIP_VER"
    };

    var CarverToolMode = {
        TOGGLE_SELECTED: "TOGGLE_SELECTED",
        INVERSE_SELECTED: "INVERSE_SELECTED"
    };

    var CarverToolType = {
        FILLED_SQUARE_TOOL: "FILLED_SQUARE_TOOL",
        EMPTY_SQUARE_TOOL: "EMPTY_SQUARE_TOOL",
        BEVEL_CROSS_TOOL: "BEVEL_CROSS_TOOL",
        STRAIGHT_CROSS_TOOL: "STRAIGHT_CROSS_TOOL"
    };

    vm.watchForBinchChanges = false;
    vm.keepingInProbableRange = true;
    vm.allowGroupOperations = false;

    var minFeasibleNum = bigInt("1000000000000000000000000000000000000000000000000000000000000000000000000000");

    var MAX_NUMBER = luckyService.currentChooser.MAX_BIG_NUMBER;

    vm.maxNumStrBin = MAX_NUMBER.toString(2);

    var valueLength = vm.maxNumStrBin.length; // 256 bits

    vm.carvingLinesNumber = 8; // 8, 16, 32
    vm.carvingToolMode = CarverToolMode.TOGGLE_SELECTED;
    vm.carvingSelectedToolSize = 1; // 1, 2, 3, 4
    vm.carvingSelectedToolType = CarverToolType.BEVEL_CROSS_TOOL;

    vm.carvingFlip = CarverFlipMode.NO_FLIP;

    vm.carvingBoardLinesArrays = new Array(vm.carvingLinesNumber);

    vm.carvingToolUsingDigit = null;

    vm.onResetCarveBoardElement = function (rowIdx, elemIdx) {
        vm.watchForBinchChanges = false;
        setElementValue(rowIdx, elemIdx);
    };

    vm.onResetCarveBoardLine = function (rowIdx) {

        if (!vm.allowGroupOperations) {
            return;
        }

        vm.watchForBinchChanges = false;

        _.forEach(vm.carvingBoardLinesArrays[rowIdx], function (lineArray, elemIdx) {
            setElementValue(rowIdx, elemIdx);
        });
    };

    vm.onResetCarveBoardCol = function (colIdx) {
        if (!vm.allowGroupOperations) {
            return;
        }

        vm.watchForBinchChanges = false;

        _.forEach(vm.carvingBoardLinesArrays, function (line, lineIdx) {
            setElementValue(lineIdx, colIdx);
        });
    };

    vm.onResetCarvingBoard = function () {
        vm.watchForBinchChanges = false;
        initCarvingBoard(getAppropriateRandom().toString(2));
    };

    vm.onInverseCarvingBoard = function () {
        vm.watchForBinchChanges = false;

        _.forEach(vm.carvingBoardLinesArrays, function (line, lineIdx) {
            _.forEach(line, function (elem, elemIdx) {
                setValueUltimate(vm.carvingBoardLinesArrays, lineIdx, elemIdx, inverseBit(vm.carvingBoardLinesArrays[lineIdx][elemIdx]));
            });
        });
    };

    function getClonedInversion() {

        var clonedArray = _.cloneDeep(vm.carvingBoardLinesArrays);

        _.forEach(clonedArray, function (line, lineIdx) {
            _.forEach(line, function (elem, elemIdx) {
                setValueUltimate(clonedArray, lineIdx, elemIdx, inverseBit(clonedArray[lineIdx][elemIdx]));
            });
        });

        return clonedArray;
    }

    init();


    //
    //
    //

    function setElementValue(rowIdx, elemIdx) {

        if (vm.carvingToolUsingDigit == null) {
            return;
        }

        _.forEach(getElementCubicsIndices(rowIdx, elemIdx), function (idxs, i) {
            if (vm.carvingToolMode === CarverToolMode.TOGGLE_SELECTED) {
                setValueUltimate(vm.carvingBoardLinesArrays, idxs.rowCubIdx, idxs.colCubIdx, vm.carvingToolUsingDigit);
            } else if (vm.carvingToolMode === CarverToolMode.INVERSE_SELECTED) {
                setValueUltimate(vm.carvingBoardLinesArrays, idxs.rowCubIdx, idxs.colCubIdx, inverseBit(vm.carvingBoardLinesArrays[idxs.rowCubIdx][idxs.colCubIdx]));
            } else {
                throw "Unexpected carvingToolMode: " + vm.carvingToolMode;
            }
        });
    }

    function setValueUltimate(targetArray, rowIdx, elemIdx, val) {

        targetArray[rowIdx][elemIdx] = "" + val;

        if (vm.carvingFlip !== CarverFlipMode.NO_FLIP) {
            var mirror = getMirrorIndexes(rowIdx, elemIdx);
            targetArray[mirror.rowMirIdx][mirror.colMirIdx] = "" + val;
        }
    }

    function getMirrorIndexes(rowIdx, elemIdx) {

        var maxLineIdx = vm.carvingLinesNumber - 1;
        var maxElemIdx = getLineLength() - 1;


        if (vm.carvingFlip === CarverFlipMode.FLIP_GOR) {
            return {rowMirIdx: Math.abs(maxLineIdx - rowIdx), colMirIdx: elemIdx};
        } else if (vm.carvingFlip === CarverFlipMode.FLIP_VER) {
            return {rowMirIdx: rowIdx, colMirIdx: Math.abs(maxElemIdx - elemIdx)};
        } else {
            throw "Unexpected carvingFlip: " + vm.carvingFlip;
        }
    }

    function getElementCubicsIndices(rowIdx, elemIdx) {
        var rv = [];

        var lowerBoundLine = rowIdx - vm.carvingSelectedToolSize;
        var upperBoundLine = rowIdx + vm.carvingSelectedToolSize;

        var lowerBoundElem = elemIdx - vm.carvingSelectedToolSize;
        var upperBoundElem = elemIdx + vm.carvingSelectedToolSize;

        if (vm.carvingSelectedToolType === CarverToolType.BEVEL_CROSS_TOOL) {

            addCubicIfAvailable(rv, rowIdx, elemIdx);

            var minCubIdx = 0;
            var maxCubIdx = vm.carvingSelectedToolSize - 1;

            for (var i = minCubIdx; i <= maxCubIdx; i++) {
                addCubicIfAvailable(rv, rowIdx - i, elemIdx - i);
                addCubicIfAvailable(rv, rowIdx - i, elemIdx + i);
                addCubicIfAvailable(rv, rowIdx + i, elemIdx - i);
                addCubicIfAvailable(rv, rowIdx + i, elemIdx + i);
            }
        } else if (vm.carvingSelectedToolType === CarverToolType.BEVEL_CROSS_TOOL) {

        } else if (vm.carvingSelectedToolType === CarverToolType.STRAIGHT_CROSS_TOOL) {

            for (var i = lowerBoundLine; i <= upperBoundLine; i++) {
                for (var j = lowerBoundElem; j <= upperBoundElem; j++) {

                    if (i === rowIdx || j === elemIdx) {

                        addCubicIfAvailable(rv, i, j);
                    }
                }
            }

        } else if (vm.carvingSelectedToolType === CarverToolType.EMPTY_SQUARE_TOOL) {

            for (var i = lowerBoundLine; i <= upperBoundLine; i++) {
                for (var j = lowerBoundElem; j <= upperBoundElem; j++) {

                    if (i === lowerBoundLine || i === upperBoundLine
                        || j === lowerBoundElem || j === upperBoundElem) {

                        addCubicIfAvailable(rv, i, j);
                    }
                }
            }

        } else if (vm.carvingSelectedToolType === CarverToolType.FILLED_SQUARE_TOOL) {

            for (var i = lowerBoundLine; i <= upperBoundLine; i++) {
                for (var j = lowerBoundElem; j <= upperBoundElem; j++) {

                    addCubicIfAvailable(rv, i, j);
                }
            }
        }

        return rv;
    }

    function addCubicIfAvailable(rv, itRowIdx, itElemIdx) {

        var candidate = {rowCubIdx: itRowIdx, colCubIdx: itElemIdx};

        if (vm.carvingBoardLinesArrays[itRowIdx] != null && vm.carvingBoardLinesArrays[itRowIdx][itElemIdx] != null) {

            if (_.includes(rv, candidate)) {
                debugger;
            } else {
                rv.push(candidate);
            }
        }
    }

    function inverseBit(bit) {
        if (bit === 1 || bit == "1") {
            return "0";
        }

        return "1";
    }

    function getFinalNumberBin(fromArray) {
        var rv = "";
        _.forEach(fromArray, function (lineArray, lineIdx) {
            _.forEach(lineArray, function (elem, elemIdx) {
                rv += elem;
            });
        });

        // console.info("getFinalNumber: " + rv);
        return rv;
    }

    function fireBigNumber(bn) {
        var bnDecStr = bn.toString(10);
        /// console.info("carved to: " + bnDecStr);
        $scope.$emit(luckyConstants.TRY_KEYS_SEQUENCE_EVT, {keysArrayToTry: [bnDecStr]});
    }

    function fireArrayIfApplicable(targetArray, timeoutMs) {
        var finalNumBinStr = getFinalNumberBin(targetArray);
        var bn = bigInt(finalNumBinStr, 2);

        if (!vm.keepingInProbableRange || isCandidateInProbableRange(bn)) {
            if (timeoutMs) {
                $timeout(function () {
                    fireBigNumber(bn);
                }, timeoutMs);
            } else {
                fireBigNumber(bn);
            }
        }

        return bn;
    }

    function init() {

        initCarvingBoard(getAppropriateRandom().toString(2));

        $scope.$watch(function () {
            return vm.carvingBoardLinesArrays;
        }, function (newVal, oldVal) {

            if (vm.watchForBinchChanges) {
                return;
            }

            fireArrayIfApplicable(getClonedInversion(vm.carvingBoardLinesArrays));

            var bn = fireArrayIfApplicable(vm.carvingBoardLinesArrays, 30);

            if (vm.keepingInProbableRange && !isCandidateInProbableRange(bn)) {
                initCarvingBoard(getAppropriateRandom().toString(2));
            }

        }, true);

        $scope.$watch(function () {
            return vm.carvingLinesNumber;
        }, function (newVal, oldVal) {
            if (newVal && oldVal) {
                reSizeCarvingBoard();
                $("select").blur();
            }
        });

        $(document).keypress(function (evt) {
            var charCode = evt.which || evt.keyCode;
            var char = String.fromCharCode(charCode);

            if (/[1]/g.test(char)) {
                vm.carvingToolUsingDigit = "1";
            } else if (/[2]/g.test(char) || /[0]/g.test(char)) {
                vm.carvingToolUsingDigit = "0";
            } else if (/[3]/g.test(char)) {
                vm.carvingToolUsingDigit = "3";
                vm.carvingToolMode = CarverToolMode.INVERSE_SELECTED;
            } else {
                vm.carvingToolUsingDigit = null;
            }

            // console.info("onDigitUpIncrement: " + vm.carvingToolUsingDigit);

            $timeout($scope.$apply());
        });

        $(document).keyup(function (evt) {
            if (vm.carvingToolUsingDigit === "3") {
                vm.carvingToolMode = CarverToolMode.TOGGLE_SELECTED;
            }
            vm.carvingToolUsingDigit = null;
            $timeout($scope.$apply());
        });

        $scope.$on(luckyConstants.KEY_VALUE_CHANGED_EVT, function (event, args) {

            if (!vm.watchForBinchChanges) {
                return;
            }

            var newKeyVal = args.newChosenKey;
            var newKeyValBin = bigInt(newKeyVal).toString(2);
            initCarvingBoard(newKeyValBin);
        });


        $scope.$watch(function () {
            return vm.watchForBinchChanges;
        }, function (newVal, oldVal) {
            if (vm.watchForBinchChanges) {
                vm.keepingInProbableRange = false;
            }
        });
    }

    function isCandidateInProbableRange(bigNum) {
        return bigNum.lesserOrEquals(MAX_NUMBER) && minFeasibleNum.lesserOrEquals(bigNum);
    }

    function reSizeCarvingBoard() {
        var currentVal = getFinalNumberBin(vm.carvingBoardLinesArrays);
        initCarvingBoard(currentVal);
    }

    function initCarvingBoard(initialStrBin) {

        while (initialStrBin.length < valueLength) {
            initialStrBin = "0" + initialStrBin;
        }

        console.info("Resetting carving board.");

        var lineLength = getLineLength();

        vm.carvingBoardLinesArrays = new Array(vm.carvingLinesNumber);

        _.forEach(vm.carvingBoardLinesArrays, function (line, lineIdx) {
            vm.carvingBoardLinesArrays[lineIdx] = new Array(lineLength);
            var lineArray = vm.carvingBoardLinesArrays[lineIdx];

            _.forEach(lineArray, function (elem, elemIdx) {

                var charIdx = (lineIdx * lineLength) + elemIdx;

                var char = initialStrBin.charAt(charIdx);
                lineArray[elemIdx] = char;
            });
        });
    }

    function getAppropriateRandom() {
        return bigInt.randBetween(minFeasibleNum, luckyService.currentChooser.MAX_BIG_NUMBER);
    }

    function getLineLength() {
        return valueLength / vm.carvingLinesNumber;
    }
}

]);

